/**
 * Provider utility functions
 *
 * Centralized utilities for determining model providers.
 * When adding new providers, update these functions instead of
 * scattering .startsWith() checks throughout the codebase.
 */

import type { ModelProvider } from './settings.js';
import { CLAUDE_MODEL_MAP, CODEX_MODEL_MAP } from './model.js';
import { GEMINI_MODEL_MAP } from './gemini-models.js';

/** Provider prefix constants */
export const PROVIDER_PREFIXES = {
  codex: 'codex-',
  gemini: 'gemini-',
} as const;

/**
 * Check if a model string represents a Claude model
 *
 * @param model - Model string to check (e.g., "sonnet", "opus", "claude-sonnet-4-6")
 * @returns true if the model is a Claude model
 */
export function isClaudeModel(model: string | undefined | null): boolean {
  if (!model || typeof model !== 'string') return false;

  // Check if it's a Claude model alias (haiku, sonnet, opus)
  if (model in CLAUDE_MODEL_MAP) {
    return true;
  }

  // Check if it contains 'claude-' in the string (full model ID)
  return model.includes('claude-');
}

/**
 * Check if a model string represents a Codex/OpenAI model
 *
 * @param model - Model string to check (e.g., "gpt-5.2", "o1", "codex-gpt-5.2")
 * @returns true if the model is a Codex model
 */
export function isCodexModel(model: string | undefined | null): boolean {
  if (!model || typeof model !== 'string') return false;

  // Check for explicit codex- prefix
  if (model.startsWith(PROVIDER_PREFIXES.codex)) {
    return true;
  }

  // Check if it's a gpt- model (bare gpt models go to Codex)
  if (model.startsWith('gpt-')) {
    return true;
  }

  // Check if it's an o-series model (o1, o3, etc.)
  if (/^o\d/.test(model)) {
    return true;
  }

  // Check if it's in the CODEX_MODEL_MAP
  return model in CODEX_MODEL_MAP;
}

/**
 * Check if a model string represents a Gemini model
 *
 * @param model - Model string to check (e.g., "gemini-2.5-pro", "gemini-3-pro-preview")
 * @returns true if the model is a Gemini model
 */
export function isGeminiModel(model: string | undefined | null): boolean {
  if (!model || typeof model !== 'string') return false;

  // Canonical format: gemini- prefix (e.g., "gemini-2.5-flash")
  if (model.startsWith(PROVIDER_PREFIXES.gemini)) {
    return true;
  }

  // Check if it's a known Gemini model ID (map keys include gemini- prefix)
  if (model in GEMINI_MODEL_MAP) {
    return true;
  }

  return false;
}

/**
 * Get the provider for a model string
 *
 * @param model - Model string to check
 * @returns The provider type, defaults to 'claude' for unknown models
 */
export function getModelProvider(model: string | undefined | null): ModelProvider {
  // Check Gemini since it uses gemini- prefix
  if (isGeminiModel(model)) {
    return 'gemini';
  }
  // Check Codex
  if (isCodexModel(model)) {
    return 'codex';
  }
  return 'claude';
}

/**
 * Strip the provider prefix from a model string
 *
 * @param model - Model string that may have a provider prefix
 * @returns Model string without provider prefix
 *
 * @example
 * stripProviderPrefix('codex-gpt-5.2') // 'gpt-5.2'
 * stripProviderPrefix('sonnet') // 'sonnet'
 */
export function stripProviderPrefix(model: string): string {
  if (!model || typeof model !== 'string') return model;

  for (const prefix of Object.values(PROVIDER_PREFIXES)) {
    if (model.startsWith(prefix)) {
      return model.slice(prefix.length);
    }
  }
  return model;
}

/**
 * Add the provider prefix to a model string if not already present
 *
 * @param model - Bare model ID
 * @param provider - Provider to add prefix for
 * @returns Model string with provider prefix
 *
 * @example
 * addProviderPrefix('gpt-5.2', 'codex') // 'codex-gpt-5.2'
 * addProviderPrefix('sonnet', 'claude') // 'sonnet' (Claude doesn't use prefix)
 * addProviderPrefix('2.5-flash', 'gemini') // 'gemini-2.5-flash'
 */
export function addProviderPrefix(model: string, provider: ModelProvider): string {
  if (!model || typeof model !== 'string') return model;

  if (provider === 'codex') {
    if (!model.startsWith(PROVIDER_PREFIXES.codex)) {
      return `${PROVIDER_PREFIXES.codex}${model}`;
    }
  } else if (provider === 'gemini') {
    if (!model.startsWith(PROVIDER_PREFIXES.gemini)) {
      return `${PROVIDER_PREFIXES.gemini}${model}`;
    }
  }
  // Claude models don't use prefixes
  return model;
}

/**
 * Get the bare model ID from a model string (without provider prefix)
 *
 * @param model - Model string that may have a provider prefix
 * @returns The bare model ID
 */
export function getBareModelId(model: string): string {
  return stripProviderPrefix(model);
}

/**
 * Normalize a model string to its canonical form
 *
 * With the new canonical format:
 * - Claude models: can use legacy aliases or claude- prefix
 * - Codex models: always have codex- prefix
 * - Gemini models: always have gemini- prefix
 *
 * @param model - Model string to normalize
 * @returns Normalized model string
 */
export function normalizeModelString(model: string | undefined | null): string {
  if (!model || typeof model !== 'string') return 'claude-sonnet'; // Default to canonical

  // Already has a canonical prefix - return as-is
  if (
    model.startsWith(PROVIDER_PREFIXES.codex) ||
    model.startsWith(PROVIDER_PREFIXES.gemini) ||
    model.startsWith('claude-')
  ) {
    return model;
  }

  // Legacy Claude aliases
  if (model in CLAUDE_MODEL_MAP) {
    return `claude-${model}`;
  }

  // For Codex, bare gpt-* and o-series models need codex- prefix
  if (model.startsWith('gpt-') || /^o\d/.test(model)) {
    return `${PROVIDER_PREFIXES.codex}${model}`;
  }

  return model;
}

/**
 * Check if a model supports structured output (JSON schema)
 *
 * Structured output is a feature that allows the model to return responses
 * conforming to a JSON schema. Currently supported by:
 * - Claude models (native Anthropic API support)
 * - Codex/OpenAI models (via response_format with json_schema)
 *
 * Models that do NOT support structured output:
 * - Gemini models (different API)
 *
 * @param model - Model string to check
 * @returns true if the model supports structured output
 *
 * @example
 * supportsStructuredOutput('sonnet') // true (Claude)
 * supportsStructuredOutput('claude-sonnet-4-6') // true (Claude)
 * supportsStructuredOutput('codex-gpt-5.2') // true (Codex/OpenAI)
 * supportsStructuredOutput('gemini-2.5-pro') // false
 */
export function supportsStructuredOutput(model: string | undefined | null): boolean {
  // Exclude proxy providers first
  if (isGeminiModel(model)) {
    return false;
  }
  return isClaudeModel(model) || isCodexModel(model);
}

/**
 * Validate that a model ID does not contain a provider prefix
 *
 * Providers should receive bare model IDs (e.g., "gpt-5.1-codex-max")
 * without provider prefixes (e.g., NOT "codex-gpt-5.1-codex-max").
 *
 * This validation ensures the ProviderFactory properly stripped prefixes before
 * passing models to providers.
 *
 * @param model - Model ID to validate
 * @param providerName - Name of the provider for error messages
 * @throws Error if model contains a provider prefix
 *
 * @example
 * validateBareModelId("gpt-5.1-codex-max", "CodexProvider");  // ✅ OK
 * validateBareModelId("codex-gpt-5.1-codex-max", "CodexProvider");  // ❌ Throws error
 */
export function validateBareModelId(model: string, providerName: string): void {
  if (!model || typeof model !== 'string') {
    throw new Error(`[${providerName}] Invalid model ID: expected string, got ${typeof model}`);
  }

  for (const [provider, prefix] of Object.entries(PROVIDER_PREFIXES)) {
    if (model.startsWith(prefix)) {
      throw new Error(
        `[${providerName}] Model ID should not contain provider prefix '${prefix}'. ` +
          `Got: '${model}'. ` +
          `This is likely a bug in ProviderFactory - it should strip the '${provider}' prefix ` +
          `before passing the model to the provider.`
      );
    }
  }
}
