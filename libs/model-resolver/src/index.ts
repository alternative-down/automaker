/**
 * @automaker/model-resolver
 * Model resolution utilities for AutoMaker (Forked for Web-only)
 */

// Re-export constants from types
export {
  CLAUDE_MODEL_MAP,
  DEFAULT_MODELS,
  type ModelAlias,
} from '@automaker/types';

// Export resolver functions
export {
  resolveModelString,
  getEffectiveModel,
  resolvePhaseModel,
  type ResolvedPhaseModel,
} from './resolver.js';
