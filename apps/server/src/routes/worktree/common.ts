/**
 * Common utilities for worktree routes (Forked for Web-only)
 */

import {
  createLogger,
  isValidBranchName,
  isValidRemoteName,
  MAX_BRANCH_NAME_LENGTH,
} from '@automaker/utils';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getErrorMessage as getErrorMessageShared, createLogError } from '../common.js';

export { execGitCommand } from '../../lib/git.js';

const logger = createLogger('Worktree');
export const execAsync = promisify(exec);

export { isValidBranchName, isValidRemoteName, MAX_BRANCH_NAME_LENGTH };

/**
 * Standard path configuration for shell commands.
 */
export const execEnv = {
  ...process.env,
};

export async function isGhCliAvailable(): Promise<boolean> {
  try {
    const checkCommand = process.platform === 'win32' ? 'where gh' : 'command -v gh';
    await execAsync(checkCommand, { env: execEnv });
    return true;
  } catch {
    return false;
  }
}

export const AUTOMAKER_INITIAL_COMMIT_MESSAGE = 'chore: automaker initial commit';

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

export async function hasCommits(repoPath: string): Promise<boolean> {
  try {
    await execAsync('git rev-parse --verify HEAD', { cwd: repoPath });
    return true;
  } catch {
    return false;
  }
}

export function isENOENT(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}

export function isMockPath(worktreePath: string): boolean {
  return worktreePath.startsWith('/mock/') || worktreePath.includes('/mock/');
}

export function logWorktreeError(error: unknown, message: string, worktreePath?: string): void {
  if (isENOENT(error) && worktreePath && isMockPath(worktreePath)) {
    return;
  }
  logError(error, message);
}

export { getErrorMessageShared as getErrorMessage };
export const logError = createLogError(logger);

export async function ensureInitialCommit(
  repoPath: string,
  env?: Record<string, string>
): Promise<boolean> {
  try {
    await execAsync('git rev-parse --verify HEAD', { cwd: repoPath });
    return false;
  } catch {
    try {
      await execAsync(`git commit --allow-empty -m "${AUTOMAKER_INITIAL_COMMIT_MESSAGE}"`, {
        cwd: repoPath,
        env: { ...process.env, ...env },
      });
      logger.info(`[Worktree] Created initial empty commit to enable worktrees in ${repoPath}`);
      return true;
    } catch (error) {
      const reason = getErrorMessageShared(error);
      throw new Error(
        `Failed to create initial git commit. Please commit manually and retry. ${reason}`
      );
    }
  }
}
