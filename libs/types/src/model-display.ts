/**
 * Model Display Constants - UI metadata for AI models
 */

import type { ModelAlias, ThinkingLevel, ModelProvider } from './settings.js';
import type { ReasoningEffort } from './provider.js';
import type { CodexModelId } from './model.js';
import { CODEX_MODEL_MAP } from './model.js';
import { GEMINI_MODEL_MAP, type GeminiModelId } from './gemini-models.js';

export interface ModelOption {
  id: ModelAlias | CodexModelId | GeminiModelId;
  label: string;
  description: string;
  badge?: string;
  provider: ModelProvider;
}

export interface ThinkingLevelOption {
  id: ThinkingLevel;
  label: string;
}

export const CLAUDE_MODELS: ModelOption[] = [
  { id: 'haiku', label: 'Claude Haiku', description: 'Fast and efficient for simple tasks.', badge: 'Speed', provider: 'claude' },
  { id: 'sonnet', label: 'Claude Sonnet', description: 'Balanced performance with strong reasoning.', badge: 'Balanced', provider: 'claude' },
  { id: 'opus', label: 'Claude Opus', description: 'Most capable model for complex work.', badge: 'Premium', provider: 'claude' },
];

export const CODEX_MODELS: (ModelOption & { hasReasoning?: boolean })[] = [
  { id: CODEX_MODEL_MAP.gpt53Codex, label: 'GPT-5.3-Codex', description: 'Latest frontier agentic coding model.', badge: 'Premium', provider: 'codex', hasReasoning: true },
  { id: CODEX_MODEL_MAP.gpt53CodexSpark, label: 'GPT-5.3-Codex-Spark', description: 'Near-instant real-time coding model.', badge: 'Speed', provider: 'codex', hasReasoning: true },
  { id: CODEX_MODEL_MAP.gpt52Codex, label: 'GPT-5.2-Codex', description: 'Frontier agentic coding model.', badge: 'Premium', provider: 'codex', hasReasoning: true },
];

export const GEMINI_MODELS: (ModelOption & { hasThinking?: boolean })[] = Object.entries(GEMINI_MODEL_MAP).map(([id, config]) => ({
  id: id as GeminiModelId,
  label: config.label,
  description: config.description,
  badge: config.supportsThinking ? 'Thinking' : 'Speed',
  provider: 'gemini' as const,
  hasThinking: config.supportsThinking,
}));

export const THINKING_LEVELS: ThinkingLevelOption[] = [
  { id: 'none', label: 'None' },
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
  { id: 'ultrathink', label: 'Ultrathink' },
  { id: 'adaptive', label: 'Adaptive' },
];

export const THINKING_LEVEL_LABELS: Record<ThinkingLevel, string> = {
  none: 'None', low: 'Low', medium: 'Med', high: 'High', ultrathink: 'Ultra', adaptive: 'Adaptive',
};

export interface ReasoningEffortOption { id: ReasoningEffort; label: string; description: string; }

export const REASONING_EFFORT_LEVELS: ReasoningEffortOption[] = [
  { id: 'none', label: 'None', description: 'No reasoning tokens' },
  { id: 'minimal', label: 'Minimal', description: 'Very quick reasoning' },
  { id: 'low', label: 'Low', description: 'Quick responses' },
  { id: 'medium', label: 'Medium', description: 'Balance between depth and speed' },
  { id: 'high', label: 'High', description: 'Maximizes reasoning depth' },
];

export const REASONING_EFFORT_LABELS: Record<ReasoningEffort, string> = {
  none: 'None', minimal: 'Min', low: 'Low', medium: 'Med', high: 'High', xhigh: 'XHigh',
};

export function getModelDisplayName(model: string): string {
  const displayNames: Record<string, string> = {
    haiku: 'Claude Haiku', sonnet: 'Claude Sonnet', opus: 'Claude Opus',
    'claude-haiku': 'Claude Haiku', 'claude-sonnet': 'Claude Sonnet', 'claude-opus': 'Claude Opus',
    [CODEX_MODEL_MAP.gpt53Codex]: 'GPT-5.3-Codex',
    [CODEX_MODEL_MAP.gpt53CodexSpark]: 'GPT-5.3-Codex-Spark',
    [CODEX_MODEL_MAP.gpt52Codex]: 'GPT-5.2-Codex',
  };
  if (model in displayNames) return displayNames[model];
  if (model in GEMINI_MODEL_MAP) return GEMINI_MODEL_MAP[model as keyof typeof GEMINI_MODEL_MAP].label;
  return model;
}
