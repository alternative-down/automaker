import { Router } from 'express';

/**
 * Codex Routes (Web-only Fork)
 *
 * CLI-based usage and model caching removed to streamline web deployment.
 */
export function createCodexRoutes(): Router {
  const router = Router();

  // Stub for usage tracking
  router.get('/usage', async (req, res) => {
    res.json({
      error: 'Not supported',
      message: 'Codex CLI usage tracking is not available in Web-only mode.',
    });
  });

  // Stub for models - in Web mode, models are usually provided by the global model resolver/config
  router.get('/models', async (req, res) => {
    res.json({
      success: true,
      models: [],
      message: 'Dynamic model discovery via CLI is disabled in Web-only mode.',
    });
  });

  return router;
}
