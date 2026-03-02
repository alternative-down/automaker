/**
 * Model ID Migration Utilities
 *
 * Provides functions to migrate legacy model IDs to the canonical prefixed format.
 * (Forked for Web-only)
 */

import { LEGACY_CLAUDE_ALIAS_MAP, CLAUDE_CANONICAL_MAP } from './model.js';
import type { PhaseModelEntry } from './settings.js';

/**
 * Check if a string is a legacy Claude alias (short name without prefix)
 */
export function isLegacyClaudeAlias(id: string): boolean {
  return id in LEGACY_CLAUDE_ALIAS_MAP;
}

/**
 * Migrate a single model ID to canonical format
 *
 * Handles:
 * - Legacy Claude aliases (e.g., 'sonnet' -> 'claude-sonnet')
 * - Already-canonical IDs are passed through unchanged
 *
 * @param legacyId - The model ID to migrate
 * @returns The canonical model ID
 */
export function migrateModelId(legacyId: string | undefined | null): string {
  if (!legacyId) {
    return legacyId as string;
  }

  // Already has claude- prefix and is in canonical map
  if (legacyId.startsWith('claude-') && legacyId in CLAUDE_CANONICAL_MAP) {
    return legacyId;
  }

  // Legacy Claude alias (short name)
  if (isLegacyClaudeAlias(legacyId)) {
    return LEGACY_CLAUDE_ALIAS_MAP[legacyId];
  }

  // Unknown or already canonical - pass through
  return legacyId;
}

/**
 * Migrate a PhaseModelEntry to use canonical model IDs
 *
 * @param entry - The phase model entry to migrate
 * @returns Migrated phase model entry with canonical model ID
 */
export function migratePhaseModelEntry(
  entry: PhaseModelEntry | string | undefined | null
): PhaseModelEntry {
  // Handle null/undefined
  if (!entry) {
    return { model: 'claude-sonnet' }; // Default
  }

  // Handle legacy string format
  if (typeof entry === 'string') {
    return { model: migrateModelId(entry) };
  }

  // Handle PhaseModelEntry object
  return {
    ...entry,
    model: migrateModelId(entry.model),
  };
}

/**
 * Get the bare model ID for CLI calls (strip provider prefix)
 */
export function getBareModelIdForCli(modelId: string): string {
  if (!modelId) return modelId;

  // Codex models - strip prefix
  if (modelId.startsWith('codex-')) {
    return modelId.slice(6); // Remove 'codex-'
  }

  // Claude and other models - pass through
  return modelId;
}
