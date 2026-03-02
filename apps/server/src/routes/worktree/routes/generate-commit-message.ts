/**
 * POST /worktree/generate-commit-message endpoint - Generate an AI commit message from git diff
 */

import type { Request, Response } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import { createLogger } from '@automaker/utils';
import { stripProviderPrefix } from '@automaker/types';
import { resolvePhaseModel } from '@automaker/model-resolver';
import { mergeCommitMessagePrompts } from '@automaker/prompts';
import { ProviderFactory } from '../../../providers/provider-factory.js';
import type { SettingsService } from '../../../services/settings-service.js';
import { getErrorMessage, logError } from '../common.js';
import { getPhaseModelWithOverrides } from '../../../lib/settings-helpers.js';

const logger = createLogger('GenerateCommitMessage');
const execFileAsync = promisify(execFile);

async function getSystemPrompt(settingsService?: SettingsService): Promise<string> {
  const settings = await settingsService?.getGlobalSettings();
  const prompts = mergeCommitMessagePrompts(settings?.promptCustomization?.commitMessage);
  return prompts.systemPrompt;
}

export function createGenerateCommitMessageHandler(settingsService?: SettingsService): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { worktreePath } = req.body;
      if (!worktreePath || typeof worktreePath !== 'string') {
        res.status(400).json({ success: false, error: 'worktreePath is required' });
        return;
      }

      let { stdout: diff } = await execFileAsync('git', ['diff', '--cached'], { cwd: worktreePath });
      if (!diff.trim()) {
        const { stdout: unstaged } = await execFileAsync('git', ['diff'], { cwd: worktreePath });
        diff = unstaged;
      }

      if (!diff.trim()) {
        res.status(400).json({ success: false, error: 'No changes to commit' });
        return;
      }

      const { phaseModel: phaseModelEntry, provider, credentials } = await getPhaseModelWithOverrides('commitMessageModel', settingsService, worktreePath, '[GenerateCommitMessage]');
      const { model, thinkingLevel } = resolvePhaseModel(phaseModelEntry);
      const systemPrompt = await getSystemPrompt(settingsService);

      const aiProvider = ProviderFactory.getProviderForModel(model);
      const bareModel = stripProviderPrefix(model);

      let responseText = '';
      const stream = aiProvider.executeQuery({
        prompt: `Generate commit message for diff:\n\n${diff.substring(0, 10000)}`,
        model: bareModel,
        cwd: worktreePath,
        systemPrompt,
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

      res.json({ success: true, message: responseText.trim() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };
}
