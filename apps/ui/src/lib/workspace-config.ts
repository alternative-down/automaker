/**
 * Utility functions for determining default workspace directories
 * Centralizes the logic for determining where projects should be created/opened
 */

import { createLogger } from '@automaker/utils/logger';
import { getHttpApiClient } from './http-api-client';
import { useAppStore } from '@/store/app-store';
import { getHttpApiClient } from '@/lib/http-api-client';

const logger = createLogger('WorkspaceConfig');

/**
 * Browser-compatible path join utility
 * Works in both Node.js and browser environments
 */
function joinPath(...parts: string[]): string {
  // Remove empty parts and normalize separators
  const normalized = parts
    .filter((p) => p)
    .map((p) => p.replace(/\\/g, '/'))
    .join('/')
    .replace(/\/+/g, '/'); // Remove duplicate slashes

  // Preserve leading slash if first part had it
  const hasLeadingSlash = parts[0]?.startsWith('/');
  return hasLeadingSlash ? '/' + normalized.replace(/^\//, '') : normalized;
}

/**
 * Gets the default Documents/Automaker directory path
 * @returns Promise resolving to Documents/Automaker path, or null if unavailable
 */
async function getDefaultDocumentsPath(): Promise<string | null> {
  try {
    // Try resolving the user documents path from workspace API
    const api = getHttpApiClient();
    const documentsResult = await api.workspace.getPath?.('documents');
    const documentsPath = (documentsResult as any)?.path as string | undefined;
    if (documentsPath) {
      return joinPath(documentsPath, 'Automaker');
    }

    // In web mode (without desktop bridge), we can't always access the user's Documents folder
    // Return null to let the caller use other fallback mechanisms (like server's DATA_DIR)
    return null;
  } catch (error) {
    logger.error('Failed to get documents path:', error);
    return null;
  }
}

/**
 * Determines the default directory for project creation/opening
 * Priority order:
 * 1. ALLOWED_ROOT_DIRECTORY (if configured)
 * 2. Last used directory from localStorage (if ALLOWED_ROOT_DIRECTORY is not set)
 * 3. Documents/Automaker (if ALLOWED_ROOT_DIRECTORY is not set)
 * 4. DATA_DIR (if ALLOWED_ROOT_DIRECTORY is not set and Documents unavailable)
 * 5. null (no default)
 *
 * @returns Promise resolving to the default directory path, or null if none available
 */
export async function getDefaultWorkspaceDirectory(): Promise<string | null> {
  try {
    const httpClient = getHttpApiClient();
    const result = await httpClient.workspace.getConfig();

    if (result.success) {
      // If ALLOWED_ROOT_DIRECTORY is configured, use it
      if (result.configured && result.workspaceDir) {
        return result.workspaceDir;
      }

      // If ALLOWED_ROOT_DIRECTORY is not set, use priority:
      // 1. Last used directory (from store, synced via API)
      // 2. Documents/Automaker
      // 3. DATA_DIR as fallback
      const lastUsedDir = useAppStore.getState().lastProjectDir;

      if (lastUsedDir) {
        return lastUsedDir;
      }

      // Try to get Documents/Automaker
      const documentsPath = await getDefaultDocumentsPath();
      logger.info('Default documentsPath resolved to:', documentsPath);
      if (documentsPath) {
        return documentsPath;
      }

      // Fallback to DATA_DIR if available
      if (result.defaultDir) {
        return result.defaultDir;
      }
    }

    // If API call failed, still try last used dir and Documents
    const lastUsedDir = useAppStore.getState().lastProjectDir;

    if (lastUsedDir) {
      return lastUsedDir;
    }

    const documentsPath = await getDefaultDocumentsPath();
    return documentsPath;
  } catch (error) {
    logger.error('Failed to get default workspace directory:', error);

    // On error, try last used dir and Documents
    const lastUsedDir = useAppStore.getState().lastProjectDir;

    if (lastUsedDir) {
      return lastUsedDir;
    }

    const documentsPath = await getDefaultDocumentsPath();
    return documentsPath;
  }
}

/**
 * Saves the last used project directory to the store (synced via API)
 * @param path - The directory path to save
 */
export function saveLastProjectDirectory(path: string): void {
  useAppStore.getState().setLastProjectDir(path);
}
