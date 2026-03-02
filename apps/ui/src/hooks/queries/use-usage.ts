/**
 * Usage Query Hooks
 *
 * React Query hooks for fetching Claude, Codex, and Gemini API usage data.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/lib/query-client';
import { getHttpApiClient } from '@/lib/http-api-client';
import type { ClaudeUsage, CodexUsage, GeminiUsage } from '@/store/app-store';

const USAGE_POLLING_INTERVAL = 60 * 1000;

export function useClaudeUsage(enabled = true) {
  return useQuery({
    queryKey: queryKeys.usage.claude(),
    queryFn: async (): Promise<ClaudeUsage> => {
      const api = getHttpApiClient();
      const result = await api.claude.getUsage();
      if ('error' in result) throw new Error(result.message || result.error);
      return result;
    },
    enabled,
    staleTime: STALE_TIMES.USAGE,
    refetchInterval: enabled ? USAGE_POLLING_INTERVAL : false,
    placeholderData: (previousData) => previousData,
  });
}

export function useCodexUsage(enabled = true) {
  return useQuery({
    queryKey: queryKeys.usage.codex(),
    queryFn: async (): Promise<CodexUsage> => {
      const api = getHttpApiClient();
      const result = await api.codex.getUsage();
      if ('error' in result) throw new Error(result.message || result.error);
      return result;
    },
    enabled,
    staleTime: STALE_TIMES.USAGE,
    refetchInterval: enabled ? USAGE_POLLING_INTERVAL : false,
    placeholderData: (previousData) => previousData,
  });
}

export function useGeminiUsage(enabled = true) {
  return useQuery({
    queryKey: queryKeys.usage.gemini(),
    queryFn: async (): Promise<GeminiUsage> => {
      const api = getHttpApiClient();
      const result = await api.gemini.getUsage();
      if (!('authenticated' in result) && 'error' in result) {
        throw new Error(result.message || result.error);
      }
      return result as GeminiUsage;
    },
    enabled,
    staleTime: STALE_TIMES.USAGE,
    refetchInterval: enabled ? USAGE_POLLING_INTERVAL : false,
    placeholderData: (previousData) => previousData,
  });
}
