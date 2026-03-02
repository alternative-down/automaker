/**
 * POST /context/describe-image endpoint - Generate description for an image
 */

import type { Request, Response } from 'express';
import { createLogger, readImageAsBase64 } from '@automaker/utils';
import { resolvePhaseModel } from '@automaker/model-resolver';
import { simpleQuery } from '../../../providers/simple-query-service.js';
import * as secureFs from '../../../lib/secure-fs.js';
import * as path from 'path';
import type { SettingsService } from '../../../services/settings-service.js';
import {
  getAutoLoadClaudeMdSetting,
  getPromptCustomization,
  getPhaseModelWithOverrides,
} from '../../../lib/settings-helpers.js';

const logger = createLogger('DescribeImage');

function findActualFilePath(requestedPath: string): string | null {
  if (secureFs.existsSync(requestedPath)) return requestedPath;
  const normalizedPath = requestedPath.normalize('NFC');
  if (secureFs.existsSync(normalizedPath)) return normalizedPath;
  return null;
}

export function createDescribeImageHandler(settingsService?: SettingsService): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response): Promise<void> => {
    const requestId = `describe-image-${Date.now()}`;
    try {
      const { imagePath } = req.body;
      if (!imagePath) {
        res.status(400).json({ success: false, error: 'imagePath is required' });
        return;
      }

      const actualPath = findActualFilePath(imagePath);
      if (!actualPath) {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      const imageData = await readImageAsBase64(actualPath);
      const cwd = path.dirname(actualPath);

      const autoLoadClaudeMd = await getAutoLoadClaudeMdSetting(cwd, settingsService, '[DescribeImage]');
      const { phaseModel: phaseModelEntry, provider, credentials } = await getPhaseModelWithOverrides('imageDescriptionModel', settingsService, cwd, '[DescribeImage]');
      const { model, thinkingLevel } = resolvePhaseModel(phaseModelEntry);

      const prompts = await getPromptCustomization(settingsService, '[DescribeImage]');
      const instructionText = prompts.contextDescription.describeImagePrompt;

      const prompt = [
        { type: 'text', text: instructionText },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imageData.mimeType,
            data: imageData.base64,
          },
        },
      ];

      const result = await simpleQuery({
        prompt,
        model,
        cwd,
        maxTurns: 1,
        thinkingLevel,
        readOnly: true,
        settingSources: autoLoadClaudeMd ? ['user', 'project', 'local'] : undefined,
        claudeCompatibleProvider: provider,
        credentials,
      });

      res.json({ success: true, description: result.text.trim() });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  };
}
