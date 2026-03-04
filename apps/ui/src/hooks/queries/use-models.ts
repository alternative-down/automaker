/**
 * Models Query Hooks
 *
 * React Query hooks for fetching available AI models.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/lib/query-client';
import type { ModelDefinition } from '@automaker/types';
import { getHttpApiClient } from '@/lib/http-api-client';

interface CodexModel {
  id: string;
  label: string;
  description: string;
  hasThinking: boolean;
  supportsVision: boolean;
  tier: 'premium' | 'standard' | 'basic';
  isDefault: boolean;
}

/**
 * Fetch available models
 *
 * @returns Query result with available models
 */
export function useAvailableModels() {
  return useQuery({
    queryKey: queryKeys.models.available(),
    queryFn: async () => {
      const api = getHttpApiClient();
      if (!api.model) {
        throw new Error('Model API not available');
      }
      const result = await api.model.getAvailable();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch available models');
      }
      return result.models ?? [];
    },
    staleTime: STALE_TIMES.MODELS,
  });
}

/**
 * Fetch Codex models
 *
 * @param refresh - Force refresh from server
 * @returns Query result with Codex models
 */
export function useCodexModels(refresh = false) {
  return useQuery({
    queryKey: queryKeys.models.codex(),
    queryFn: async (): Promise<CodexModel[]> => {
      const api = getHttpApiClient();
      if (!api.codex) {
        throw new Error('Codex API not available');
      }
      const result = await api.codex.getModels(refresh);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Codex models');
      }
      return (result.models ?? []) as CodexModel[];
    },
    staleTime: STALE_TIMES.MODELS,
  });
}

/**
 * Fetch model providers status
 *
 * @returns Query result with provider status
 */
export function useModelProviders() {
  return useQuery({
    queryKey: queryKeys.models.providers(),
    queryFn: async () => {
      const api = getHttpApiClient();
      if (!api.model) {
        throw new Error('Model API not available');
      }
      const result = await api.model.checkProviders();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch providers');
      }
      return result.providers ?? {};
    },
    staleTime: STALE_TIMES.MODELS,
  });
}
