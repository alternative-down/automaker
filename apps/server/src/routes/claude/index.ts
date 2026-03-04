import { Router } from 'express';

/**
 * Claude Routes (Web-only Fork)
 *
 * CLI-based usage tracking removed to streamline web deployment.
 */
export function createClaudeRoutes(): Router {
  const router = Router();

  // Stub for usage tracking - no longer supported in Web-only mode without local CLI access
  router.get('/usage', async (req, res) => {
    res.json({
      error: 'Not supported',
      message: 'Claude CLI usage tracking is not available in Web-only mode.',
    });
  });

  return router;
}
