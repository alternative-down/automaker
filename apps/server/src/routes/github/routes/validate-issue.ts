/**
 * POST /validate-issue endpoint - Validate a GitHub issue using provider abstraction (async)
 *
 * Scans the codebase to determine if an issue is valid, invalid, or needs clarification.
 * Runs asynchronously and emits events for progress and completion.
 * Supports Claude and Codex models.
 */

import type { Request, Response } from 'express';
import type { EventEmitter } from '../../../lib/events.js';
import type {
  IssueValidationResult,
  IssueValidationEvent,
  ModelId,
  GitHubComment,
  LinkedPRInfo,
  ThinkingLevel,
  ReasoningEffort,
} from '@automaker/types';
import {
  DEFAULT_PHASE_MODELS,
  isClaudeModel,
  isCodexModel,
  isGeminiModel,
  supportsStructuredOutput,
} from '@automaker/types';
import { resolvePhaseModel, resolveModelString } from '@automaker/model-resolver';
import { extractJson } from '../../../lib/json-extractor.js';
import { writeValidation } from '../../../lib/validation-storage.js';
import { streamingQuery } from '../../../providers/simple-query-service.js';
import {
  issueValidationSchema,
  buildValidationPrompt,
  ValidationComment,
  ValidationLinkedPR,
} from './validation-schema.js';
import {
  getPromptCustomization,
  getAutoLoadClaudeMdSetting,
  getProviderByModelId,
} from '../../../lib/settings-helpers.js';
import {
  trySetValidationRunning,
  clearValidationStatus,
  getErrorMessage,
  logError,
  logger,
} from './validation-common.js';
import type { SettingsService } from '../../../services/settings-service.js';

interface ValidateIssueRequestBody {
  projectPath: string;
  issueNumber: number;
  issueTitle: string;
  issueBody: string;
  issueLabels?: string[];
  model?: ModelId;
  thinkingLevel?: ThinkingLevel;
  reasoningEffort?: ReasoningEffort;
  comments?: GitHubComment[];
  linkedPRs?: LinkedPRInfo[];
}

async function runValidation(
  projectPath: string,
  issueNumber: number,
  issueTitle: string,
  issueBody: string,
  issueLabels: string[] | undefined,
  model: ModelId,
  events: EventEmitter,
  abortController: AbortController,
  settingsService?: SettingsService,
  comments?: ValidationComment[],
  linkedPRs?: ValidationLinkedPR[],
  thinkingLevel?: ThinkingLevel,
  reasoningEffort?: ReasoningEffort
): Promise<void> {
  const startEvent: IssueValidationEvent = {
    type: 'issue_validation_start',
    issueNumber,
    issueTitle,
    projectPath,
  };
  events.emit('issue-validation:event', startEvent);

  const VALIDATION_TIMEOUT_MS = 360000;
  const timeoutId = setTimeout(() => {
    logger.warn(`Validation timeout reached after ${VALIDATION_TIMEOUT_MS}ms`);
    abortController.abort();
  }, VALIDATION_TIMEOUT_MS);

  try {
    const basePrompt = buildValidationPrompt(issueNumber, issueTitle, issueBody, issueLabels, comments, linkedPRs);
    let responseText = '';
    const prompts = await getPromptCustomization(settingsService, '[ValidateIssue]');
    const issueValidationSystemPrompt = prompts.issueValidation.systemPrompt;
    const useStructuredOutput = supportsStructuredOutput(model);

    let finalPrompt = basePrompt;
    if (!useStructuredOutput) {
      finalPrompt = `${issueValidationSystemPrompt}\n\nCRITICAL: Respond with ONLY raw JSON matching this schema:\n${JSON.stringify(issueValidationSchema, null, 2)}\n\n${basePrompt}`;
    }

    const autoLoadClaudeMd = await getAutoLoadClaudeMdSetting(projectPath, settingsService, '[ValidateIssue]');

    let effectiveThinkingLevel: ThinkingLevel | undefined = thinkingLevel;
    let effectiveReasoningEffort: ReasoningEffort | undefined = reasoningEffort;
    
    if (!effectiveThinkingLevel || !effectiveReasoningEffort) {
      const settings = await settingsService?.getGlobalSettings();
      const phaseModelEntry = settings?.phaseModels?.validationModel || DEFAULT_PHASE_MODELS.validationModel;
      const resolved = resolvePhaseModel(phaseModelEntry);
      if (!effectiveThinkingLevel) effectiveThinkingLevel = resolved.thinkingLevel;
      if (!effectiveReasoningEffort && typeof phaseModelEntry !== 'string') {
        effectiveReasoningEffort = phaseModelEntry.reasoningEffort;
      }
    }

    let claudeCompatibleProvider: any;
    let providerResolvedModel: string | undefined;
    let credentials = await settingsService?.getCredentials();

    if (settingsService) {
      const providerResult = await getProviderByModelId(model, settingsService, '[ValidateIssue]');
      if (providerResult.provider) {
        claudeCompatibleProvider = providerResult.provider;
        providerResolvedModel = providerResult.resolvedModel;
        credentials = providerResult.credentials;
      }
    }

    const effectiveModel = claudeCompatibleProvider ? (model as string) : providerResolvedModel || resolveModelString(model as string);

    const result = await streamingQuery({
      prompt: finalPrompt,
      model: effectiveModel,
      cwd: projectPath,
      systemPrompt: useStructuredOutput ? issueValidationSystemPrompt : undefined,
      abortController,
      thinkingLevel: effectiveThinkingLevel,
      reasoningEffort: effectiveReasoningEffort,
      readOnly: true,
      settingSources: autoLoadClaudeMd ? ['user', 'project', 'local'] : undefined,
      claudeCompatibleProvider,
      credentials,
      outputFormat: useStructuredOutput ? { type: 'json_schema', schema: issueValidationSchema as any } : undefined,
      onText: (text) => {
        responseText += text;
        events.emit('issue-validation:event', { type: 'issue_validation_progress', issueNumber, content: text, projectPath });
      },
    });

    clearTimeout(timeoutId);
    let validationResult: IssueValidationResult | null = null;

    if (result.structured_output) {
      validationResult = result.structured_output as any;
    } else if (responseText) {
      validationResult = extractJson<IssueValidationResult>(responseText, { logger });
    }

    if (!validationResult) throw new Error('Validation failed: no valid result received');

    await writeValidation(projectPath, issueNumber, {
      issueNumber,
      issueTitle,
      validatedAt: new Date().toISOString(),
      model,
      result: validationResult,
    });

    events.emit('issue-validation:event', { type: 'issue_validation_complete', issueNumber, issueTitle, result: validationResult, projectPath, model });
  } catch (error) {
    clearTimeout(timeoutId);
    events.emit('issue-validation:event', { type: 'issue_validation_error', issueNumber, error: getErrorMessage(error), projectPath });
    throw error;
  }
}

export function createValidateIssueHandler(events: EventEmitter, settingsService?: SettingsService) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { projectPath, issueNumber, issueTitle, issueBody, model = 'sonnet', thinkingLevel, reasoningEffort, comments: rawComments, linkedPRs: rawLinkedPRs } = req.body as ValidateIssueRequestBody;

      if (!projectPath) { res.status(400).json({ success: false, error: 'projectPath is required' }); return; }
      if (!issueNumber) { res.status(400).json({ success: false, error: 'issueNumber is required' }); return; }

      const isValidModel = isClaudeModel(model) || isCodexModel(model) || isGeminiModel(model);
      if (!isValidModel) {
        res.status(400).json({ success: false, error: 'Invalid model. Must be Claude, Codex, or Gemini.' });
        return;
      }

      const abortController = new AbortController();
      if (!trySetValidationRunning(projectPath, issueNumber, abortController)) {
        res.json({ success: false, error: `Validation is already running for issue #${issueNumber}` });
        return;
      }

      runValidation(projectPath, issueNumber, issueTitle, issueBody, undefined, model, events, abortController, settingsService, rawComments as any, rawLinkedPRs as any, thinkingLevel, reasoningEffort)
        .finally(() => clearValidationStatus(projectPath, issueNumber));

      res.json({ success: true, message: `Validation started for issue #${issueNumber}`, issueNumber });
    } catch (error) {
      res.status(500).json({ success: false, error: getErrorMessage(error) });
    }
  };
}
