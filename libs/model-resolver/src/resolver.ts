/**
 * Model resolution utilities for handling model string mapping
 *
 * Provides centralized model resolution logic for:
 * - Claude (Anthropic)
 * - Codex (OpenAI)
 * - Gemini (Google)
 */

import {
  CLAUDE_MODEL_MAP,
  CLAUDE_CANONICAL_MAP,
  DEFAULT_MODELS,
  PROVIDER_PREFIXES,
  isGeminiModel,
  migrateModelId,
  type PhaseModelEntry,
  type ThinkingLevel,
  type ReasoningEffort,
} from '@automaker/types';

// Pattern definitions for Codex/OpenAI models
const CODEX_MODEL_PREFIXES = ['codex-', 'gpt-'];
const OPENAI_O_SERIES_PATTERN = /^o\d/;
const OPENAI_O_SERIES_ALLOWED_MODELS = new Set<string>();

/**
 * Resolve a model key/alias to a full model string
 *
 * Handles both canonical prefixed IDs and legacy aliases:
 * - Canonical: claude-sonnet, gemini-2.5-flash
 * - Legacy: sonnet, opus
 *
 * @param modelKey - Model key
 * @param defaultModel - Fallback model if modelKey is undefined
 * @returns Full model string
 */
export function resolveModelString(
  modelKey?: string,
  defaultModel: string = DEFAULT_MODELS.claude
): string {
  // No model specified - use default
  if (!modelKey) {
    return defaultModel;
  }

  // First, migrate legacy IDs to canonical format
  const canonicalKey = migrateModelId(modelKey);

  // Codex model with explicit prefix (e.g., "codex-gpt-5.1-codex-max")
  if (canonicalKey.startsWith(PROVIDER_PREFIXES.codex)) {
    return canonicalKey;
  }

  // Gemini model with explicit prefix (e.g., "gemini-2.5-flash", "gemini-2.5-pro")
  if (isGeminiModel(canonicalKey)) {
    return canonicalKey;
  }

  // Claude canonical ID (claude-haiku, claude-sonnet, claude-opus)
  if (canonicalKey in CLAUDE_CANONICAL_MAP) {
    return CLAUDE_CANONICAL_MAP[canonicalKey as keyof typeof CLAUDE_CANONICAL_MAP];
  }

  // Full Claude model string (e.g., claude-sonnet-4-6) - pass through
  if (canonicalKey.includes('claude-')) {
    return canonicalKey;
  }

  // Legacy Claude model alias (sonnet, opus, haiku)
  const resolved = CLAUDE_MODEL_MAP[canonicalKey];
  if (resolved) {
    return resolved;
  }

  // OpenAI/Codex models - check for gpt- prefix
  if (
    CODEX_MODEL_PREFIXES.some((prefix) => canonicalKey.startsWith(prefix)) ||
    (OPENAI_O_SERIES_PATTERN.test(canonicalKey) && OPENAI_O_SERIES_ALLOWED_MODELS.has(canonicalKey))
  ) {
    return canonicalKey;
  }

  // Unknown model key - pass through as-is
  return canonicalKey;
}

export function getEffectiveModel(
  explicitModel?: string,
  sessionModel?: string,
  defaultModel?: string
): string {
  return resolveModelString(explicitModel || sessionModel, defaultModel);
}

export interface ResolvedPhaseModel {
  model: string;
  thinkingLevel?: ThinkingLevel;
  reasoningEffort?: ReasoningEffort;
  providerId?: string;
}

export function resolvePhaseModel(
  phaseModel: string | PhaseModelEntry | null | undefined,
  defaultModel: string = DEFAULT_MODELS.claude
): ResolvedPhaseModel {
  // Handle null/undefined (defensive against corrupted JSON)
  if (!phaseModel) {
    return {
      model: resolveModelString(undefined, defaultModel),
      thinkingLevel: undefined,
      reasoningEffort: undefined,
    };
  }

  // Handle legacy string format
  if (typeof phaseModel === 'string') {
    return {
      model: resolveModelString(phaseModel, defaultModel),
      thinkingLevel: undefined,
      reasoningEffort: undefined,
    };
  }

  // If providerId is set, pass through the model string unchanged
  if (phaseModel.providerId) {
    return {
      model: phaseModel.model,
      thinkingLevel: phaseModel.thinkingLevel,
      reasoningEffort: phaseModel.reasoningEffort,
      providerId: phaseModel.providerId,
    };
  }

  // No providerId - resolve through normal Claude model mapping
  return {
    model: resolveModelString(phaseModel.model, defaultModel),
    thinkingLevel: phaseModel.thinkingLevel,
    reasoningEffort: phaseModel.reasoningEffort,
  };
}
