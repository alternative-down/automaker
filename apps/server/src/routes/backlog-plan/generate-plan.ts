/**
 * Generate backlog plan using AI (Web-only Fork)
 */

import type { EventEmitter } from '../../lib/events.js';
import type { Feature, BacklogPlanResult } from '@automaker/types';
import {
  DEFAULT_PHASE_MODELS,
  stripProviderPrefix,
  type ThinkingLevel,
  type SystemPromptPreset,
} from '@automaker/types';
import { resolvePhaseModel } from '@automaker/model-resolver';
import { getCurrentBranch } from '@automaker/git-utils';
import { FeatureLoader } from '../../services/feature-loader.js';
import { ProviderFactory } from '../../providers/provider-factory.js';
import { extractJsonWithArray } from '../../lib/json-extractor.js';
import {
  logger,
  setRunningState,
  setRunningDetails,
  getErrorMessage,
  saveBacklogPlan,
} from './common.js';
import type { SettingsService } from '../../services/settings-service.js';
import {
  getAutoLoadClaudeMdSetting,
  getUseClaudeCodeSystemPromptSetting,
  getPromptCustomization,
  getPhaseModelWithOverrides,
  getProviderByModelId,
} from '../../lib/settings-helpers.js';

const featureLoader = new FeatureLoader();

function formatFeaturesForPrompt(features: Feature[]): string {
  if (features.length === 0) return 'No features in backlog yet.';
  return features.map((f) => {
    const deps = f.dependencies?.length ? `Dependencies: [${f.dependencies.join(', ')}]` : '';
    return `- ID: ${f.id}\n  Title: ${f.title || 'Untitled'}\n  Description: ${f.description}\n  Status: ${f.status || 'backlog'}\n  ${deps}`.trim();
  }).join('\n\n');
}

function parsePlanResponse(response: string): BacklogPlanResult {
  const parsed = extractJsonWithArray<BacklogPlanResult>(response, 'changes', { logger });
  return parsed || { changes: [], summary: 'Failed to parse AI response', dependencyUpdates: [] };
}

export async function generateBacklogPlan(
  projectPath: string,
  prompt: string,
  events: EventEmitter,
  abortController: AbortController,
  settingsService?: SettingsService,
  model?: string,
  branchName?: string
): Promise<BacklogPlanResult> {
  try {
    const allFeatures = await featureLoader.getAll(projectPath);
    let features = allFeatures;
    if (branchName) {
      let primaryBranch = 'main';
      try { primaryBranch = await getCurrentBranch(projectPath); } catch {}
      const isMainBranch = branchName === primaryBranch;
      features = allFeatures.filter((f) => f.branchName ? f.branchName === branchName : isMainBranch);
    }

    const prompts = await getPromptCustomization(settingsService, '[BacklogPlan]');
    const systemPrompt = prompts.backlogPlan.systemPrompt;
    const userPrompt = prompts.backlogPlan.userPromptTemplate
      .replace('{{currentFeatures}}', formatFeaturesForPrompt(features))
      .replace('{{userRequest}}', prompt);

    let effectiveModel = model;
    let thinkingLevel: ThinkingLevel | undefined;
    let claudeCompatibleProvider: any;
    let credentials: any;

    if (settingsService) {
      const phaseResult = await getPhaseModelWithOverrides('backlogPlanningModel', settingsService, projectPath, '[BacklogPlan]');
      const resolved = resolvePhaseModel(phaseResult.phaseModel);
      effectiveModel = model || resolved.model;
      thinkingLevel = resolved.thinkingLevel;
      claudeCompatibleProvider = phaseResult.provider;
      credentials = phaseResult.credentials;
    } else {
      const resolved = resolvePhaseModel(DEFAULT_PHASE_MODELS.backlogPlanningModel);
      effectiveModel = model || resolved.model;
      thinkingLevel = resolved.thinkingLevel;
    }

    const provider = ProviderFactory.getProviderForModel(effectiveModel!);
    const bareModel = stripProviderPrefix(effectiveModel!);

    const queryOptions = {
      prompt: userPrompt,
      model: bareModel,
      cwd: projectPath,
      systemPrompt,
      maxTurns: 1,
      tools: [],
      abortController,
      thinkingLevel,
      claudeCompatibleProvider,
      credentials,
    };

    let responseText = '';
    const stream = provider.executeQuery(queryOptions);
    for await (const msg of stream) {
      if (msg.type === 'assistant' && msg.message?.content) {
        for (const block of msg.message.content) {
          if (block.type === 'text') responseText += block.text;
        }
      } else if (msg.type === 'result' && msg.subtype === 'success' && msg.result) {
        responseText = msg.result;
      }
    }

    const result = parsePlanResponse(responseText);
    await saveBacklogPlan(projectPath, { savedAt: new Date().toISOString(), prompt, model: effectiveModel!, result });
    events.emit('backlog-plan:event', { type: 'backlog_plan_complete', result });
    return result;
  } catch (error) {
    events.emit('backlog-plan:event', { type: 'backlog_plan_error', error: getErrorMessage(error) });
    throw error;
  } finally {
    setRunningState(false, null);
    setRunningDetails(null);
  }
}
