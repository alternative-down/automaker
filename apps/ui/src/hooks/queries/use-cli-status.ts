/**
 * CLI Status Query Hooks
 *
 * React Query hooks for fetching CLI tool status (Claude, GitHub CLI, etc.)
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/lib/query-client';

/**
 * Fetch Claude CLI status
 *
 * @returns Query result with Claude CLI status
 */
export function useClaudeCliStatus() {
  return useQuery({
    queryKey: queryKeys.cli.claude(),
    queryFn: async () => {
      const api = getHttpApiClient();
      if (!api.setup) {
        throw new Error('Setup API not available');
      }
      const result = await api.setup.getClaudeStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Claude status');
      }
      return result;
    },
    staleTime: STALE_TIMES.CLI_STATUS,
  });
}

/**
 * Fetch GitHub CLI status
 *
 * @returns Query result with GitHub CLI status
 */
export function useGitHubCliStatus() {
  return useQuery({
    queryKey: queryKeys.cli.github(),
    queryFn: async () => {
      const api = getHttpApiClient();
      if (!api.setup?.getGhStatus) {
        throw new Error('GitHub CLI status API not available');
      }
      const result = await api.setup.getGhStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch GitHub CLI status');
      }
      return result;
    },
    staleTime: STALE_TIMES.CLI_STATUS,
  });
}

/**
 * Fetch API keys status
 *
 * @returns Query result with API keys status
 */
export function useApiKeysStatus() {
  return useQuery({
    queryKey: queryKeys.cli.apiKeys(),
    queryFn: async () => {
      const api = getHttpApiClient();
      if (!api.setup) {
        throw new Error('Setup API not available');
      }
      const result = await api.setup.getApiKeys();
      if (!result.success) {
        throw new Error('Failed to fetch API keys');
      }
      return result;
    },
    staleTime: STALE_TIMES.CLI_STATUS,
  });
}

/**
 * Fetch platform info
 *
 * @returns Query result with platform info
 */
export function usePlatformInfo() {
  return useQuery({
    queryKey: queryKeys.cli.platform(),
    queryFn: async () => {
      const api = getHttpApiClient();
      if (!api.setup) {
        throw new Error('Setup API not available');
      }
      const result = await api.setup.getPlatform();
      if (!result.success) {
        throw new Error('Failed to fetch platform info');
      }
      return result;
    },
    staleTime: Infinity, // Platform info never changes
  });
}

/**
 * Fetch Gemini CLI status
 *
 * @returns Query result with Gemini CLI status
 */
export function useGeminiCliStatus() {
  return useQuery({
    queryKey: queryKeys.cli.gemini(),
    queryFn: async () => {
      const api = getHttpApiClient();
      if (!api.setup?.getGeminiStatus) {
        throw new Error('Gemini CLI status API not available');
      }
      const result = await api.setup.getGeminiStatus();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Gemini CLI status');
      }
      return result;
    },
    staleTime: STALE_TIMES.CLI_STATUS,
  });
}
