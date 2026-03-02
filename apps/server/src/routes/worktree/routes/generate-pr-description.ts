/**
 * POST /worktree/generate-pr-description endpoint - Generate an AI PR description from git diff
 */

import type { Request, Response } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import { createLogger } from '@automaker/utils';
import { stripProviderPrefix } from '@automaker/types';
import { resolvePhaseModel } from '@automaker/model-resolver';
import { ProviderFactory } from '../../../providers/provider-factory.js';
import type { SettingsService } from '../../../services/settings-service.js';
import { getErrorMessage, logError } from '../common.js';
import { getPhaseModelWithOverrides } from '../../../lib/settings-helpers.js';

const logger = createLogger('GeneratePRDescription');
const execFileAsync = promisify(execFile);

const PR_DESCRIPTION_SYSTEM_PROMPT = `You are a pull request description generator. Output ONLY the structured format below.
---TITLE---
<concise title>
---BODY---
<description>`;

export function createGeneratePRDescriptionHandler(settingsService?: SettingsService): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { worktreePath, baseBranch = 'main' } = req.body;
      if (!worktreePath) {
        res.status(400).json({ success: false, error: 'worktreePath is required' });
        return;
      }

      const { stdout: diff } = await execFileAsync('git', ['diff', `${baseBranch}...HEAD`], { cwd: worktreePath }).catch(() => ({ stdout: '' }));
      const { stdout: branchName } = await execFileAsync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: worktreePath });

      const { phaseModel: phaseModelEntry, provider, credentials } = await getPhaseModelWithOverrides('commitMessageModel', settingsService, worktreePath, '[GeneratePRDescription]');
      const { model, thinkingLevel } = resolvePhaseModel(phaseModelEntry);

      const aiProvider = ProviderFactory.getProviderForModel(model);
      const bareModel = stripProviderPrefix(model);

      let responseText = '';
      const stream = aiProvider.executeQuery({
        prompt: `Generate PR for branch ${branchName.trim()}.\n\nDiff:\n${diff}`,
        model: bareModel,
        cwd: worktreePath,
        systemPrompt: PR_DESCRIPTION_SYSTEM_PROMPT,
        maxTurns: 1,
        thinkingLevel,
        claudeCompatibleProvider: provider,
        credentials,
      });

      for await (const msg of stream) {
        if (msg.type === 'assistant' && msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === 'text') responseText += block.text;
          }
        }
      }

      const fullResponse = responseText.trim();
      const titleMatch = fullResponse.match(/---TITLE---\s*\n([\s\S]*?)(?=---BODY---|$)/);
      const bodyMatch = fullResponse.match(/---BODY---\s*\n([\s\S]*?)$/);

      res.json({
        success: true,
        title: titleMatch?.[1].trim() || 'Untitled PR',
        body: bodyMatch?.[1].trim() || fullResponse,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };
}
