import { Router, Request, Response } from 'express';
import { createLogger } from '@automaker/utils';
import type { EventEmitter } from '../../lib/events.js';

const logger = createLogger('Gemini');

/**
 * Gemini Routes (Web-only Fork)
 *
 * CLI-based usage tracking removed to streamline web deployment.
 */
export function createGeminiRoutes(
  _events: EventEmitter
): Router {
  const router = Router();

  // Stub for usage tracking
  router.get('/usage', async (_req: Request, res: Response) => {
    res.json({
      authenticated: true,
      authMethod: 'api_key',
      usedPercent: 0,
      remainingPercent: 100,
      lastUpdated: new Date().toISOString(),
      message: 'Gemini usage tracking is handled via API Key in Web-only mode.',
    });
  });

  // Simplified status check - assumes configured via env/settings in Web mode
  router.get('/status', async (_req: Request, res: Response) => {
    res.json({
      success: true,
      installed: true,
      version: 'web-managed',
      authenticated: true,
      authMethod: 'api_key',
    });
  });

  return router;
}
