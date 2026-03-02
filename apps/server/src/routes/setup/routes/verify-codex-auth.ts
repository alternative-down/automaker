/**
 * POST /verify-codex-auth endpoint - Verify Codex authentication
 */

import type { Request, Response } from 'express';
import { createLogger } from '@automaker/utils';
import { CODEX_MODEL_MAP } from '@automaker/types';
import { ProviderFactory } from '../../../providers/provider-factory.js';
import { getApiKey } from '../common.js';
import { getCodexAuthIndicators } from '@automaker/platform';
import {
  createSecureAuthEnv,
  AuthSessionManager,
  AuthRateLimiter,
  validateApiKey,
  createTempEnvOverride,
} from '../../../lib/auth-utils.js';

const logger = createLogger('Setup');
const rateLimiter = new AuthRateLimiter();
const OPENAI_API_KEY_ENV = 'OPENAI_API_KEY';
const AUTH_PROMPT = "Reply with only the word 'ok'";
const AUTH_TIMEOUT_MS = 30000;

export function createVerifyCodexAuthHandler() {
  return async (req: Request, res: Response): Promise<void> => {
    const { authMethod, apiKey } = req.body as {
      authMethod?: 'cli' | 'api_key';
      apiKey?: string;
    };

    const sessionId = `codex-auth-${Date.now()}`;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    if (!rateLimiter.canAttempt(clientIp)) {
      res.status(429).json({ success: false, authenticated: false, error: 'Too many attempts.' });
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), AUTH_TIMEOUT_MS);

    try {
      const authEnv = createSecureAuthEnv(authMethod || 'api_key', apiKey, 'openai');

      if (authMethod === 'api_key') {
        const keyToValidate = apiKey || getApiKey('openai');
        if (!keyToValidate) {
          res.json({ success: true, authenticated: false, error: 'API key required' });
          return;
        }
        const validation = validateApiKey(keyToValidate, 'openai');
        if (!validation.isValid) {
          res.json({ success: true, authenticated: false, error: validation.error });
          return;
        }
        authEnv[OPENAI_API_KEY_ENV] = validation.normalizedKey;
      }

      AuthSessionManager.createSession(sessionId, authMethod || 'api_key', undefined, 'openai');
      const cleanupEnv = createTempEnvOverride(authEnv);

      try {
        if (authMethod === 'cli') {
          const authIndicators = await getCodexAuthIndicators();
          if (!authIndicators.hasOAuthToken && !authIndicators.hasApiKey) {
            res.json({ success: true, authenticated: false, error: 'CLI auth required' });
            return;
          }
        }

        const provider = ProviderFactory.getProviderByName('codex');
        if (!provider) throw new Error('Codex provider not available');

        const stream = provider.executeQuery({
          prompt: AUTH_PROMPT,
          model: CODEX_MODEL_MAP.gpt52Codex,
          cwd: process.cwd(),
          maxTurns: 1,
          allowedTools: [],
          abortController,
        });

        let receivedAnyContent = false;
        for await (const msg of stream) {
          if (msg.type === 'assistant' || msg.type === 'result') receivedAnyContent = true;
          if (msg.type === 'error') throw new Error(msg.error);
        }

        res.json({ success: true, authenticated: receivedAnyContent });
      } finally {
        cleanupEnv();
      }
    } catch (error: any) {
      res.json({ success: true, authenticated: false, error: error.message });
    } finally {
      clearTimeout(timeoutId);
      AuthSessionManager.destroySession(sessionId);
    }
  };
}
