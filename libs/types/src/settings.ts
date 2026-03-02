/**
 * Settings Types - Shared types for file-based settings storage
 * (Forked for Web-only)
 */

import type { ModelAlias, ModelId } from './model.js';
import type { GeminiModelId } from './gemini-models.js';
import { getAllGeminiModelIds, DEFAULT_GEMINI_MODEL } from './gemini-models.js';
import type { PromptCustomization } from './prompts.js';
import type { CodexSandboxMode, CodexApprovalPolicy } from './codex.js';
import type { ReasoningEffort } from './provider.js';

export type { ModelAlias };

export type ThemeMode =
  | 'system'
  | 'dark' | 'retro' | 'dracula' | 'nord' | 'monokai' | 'tokyonight' | 'solarized'
  | 'gruvbox' | 'catppuccin' | 'onedark' | 'synthwave' | 'red' | 'sunset' | 'gray'
  | 'forest' | 'ocean' | 'ember' | 'ayu-dark' | 'ayu-mirage' | 'matcha'
  | 'light' | 'cream' | 'solarizedlight' | 'github' | 'paper' | 'rose' | 'mint'
  | 'lavender' | 'sand' | 'sky' | 'peach' | 'snow' | 'sepia' | 'gruvboxlight'
  | 'nordlight' | 'blossom' | 'ayu-light' | 'onelight' | 'bluloco' | 'feather';

export type TerminalPromptTheme = string;

export type PlanningMode = 'skip' | 'lite' | 'spec' | 'full';

export interface FeatureTemplate {
  id: string;
  name: string;
  prompt: string;
  model?: PhaseModelEntry;
  isBuiltIn?: boolean;
  enabled?: boolean;
  order?: number;
}

export const DEFAULT_FEATURE_TEMPLATES: FeatureTemplate[] = [
  { id: 'run-tests-lint-format', name: 'Run tests, lint, and format', prompt: 'Run all tests, lint checks, and format the codebase. Fix any issues found.', isBuiltIn: true, enabled: true, order: 0 },
];

export type ServerLogLevel = 'error' | 'warn' | 'info' | 'debug';
export type ThinkingLevel = 'none' | 'low' | 'medium' | 'high' | 'ultrathink' | 'adaptive';
export type SidebarStyle = 'unified' | 'discord';

export const THINKING_TOKEN_BUDGET: Record<ThinkingLevel, number | undefined> = {
  none: undefined, low: 1024, medium: 10000, high: 16000, ultrathink: 32000, adaptive: undefined,
};

export type ApiKeySource = 'inline' | 'env' | 'credentials';
export type ClaudeCompatibleProviderType = 'anthropic' | 'glm' | 'minimax' | 'openrouter' | 'custom';
export type ClaudeModelAlias = 'haiku' | 'sonnet' | 'opus';

export interface ProviderModel {
  id: string;
  displayName: string;
  mapsToClaudeModel?: ClaudeModelAlias;
  capabilities?: {
    supportsVision?: boolean;
    supportsThinking?: boolean;
    maxThinkingLevel?: ThinkingLevel;
  };
}

export interface ClaudeCompatibleProvider {
  id: string;
  name: string;
  providerType: ClaudeCompatibleProviderType;
  enabled?: boolean;
  baseUrl: string;
  apiKeySource: ApiKeySource;
  apiKey?: string;
  useAuthToken?: boolean;
  timeoutMs?: number;
  disableNonessentialTraffic?: boolean;
  models: ProviderModel[];
  providerSettings?: Record<string, unknown>;
}

export type EventHookTrigger = 'feature_created' | 'feature_success' | 'feature_error' | 'auto_mode_complete' | 'auto_mode_error';
export type EventHookHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';

export interface EventHookShellAction { type: 'shell'; command: string; timeout?: number; }
export interface EventHookHttpAction { type: 'http'; url: string; method: EventHookHttpMethod; headers?: Record<string, string>; body?: string; }
export type EventHookAction = EventHookShellAction | EventHookHttpAction;

export interface EventHook { id: string; trigger: EventHookTrigger; enabled: boolean; action: EventHookAction; name?: string; }

export const EVENT_HOOK_TRIGGER_LABELS: Record<EventHookTrigger, string> = {
  feature_created: 'Feature created', feature_success: 'Feature completed successfully', feature_error: 'Feature failed with error', auto_mode_complete: 'Auto mode completed all features', auto_mode_error: 'Auto mode paused due to error',
};

export interface PhaseModelEntry {
  providerId?: string;
  model: ModelId;
  thinkingLevel?: ThinkingLevel;
  reasoningEffort?: ReasoningEffort;
}

export interface PhaseModelConfig {
  enhancementModel: PhaseModelEntry;
  fileDescriptionModel: PhaseModelEntry;
  imageDescriptionModel: PhaseModelEntry;
  validationModel: PhaseModelEntry;
  specGenerationModel: PhaseModelEntry;
  featureGenerationModel: PhaseModelEntry;
  backlogPlanningModel: PhaseModelEntry;
  projectAnalysisModel: PhaseModelEntry;
  ideationModel: PhaseModelEntry;
  memoryExtractionModel: PhaseModelEntry;
  commitMessageModel: PhaseModelEntry;
  prDescriptionModel: PhaseModelEntry;
}

export type PhaseModelKey = keyof PhaseModelConfig;

export interface KeyboardShortcuts {
  board: string; agent: string; spec: string; context: string; settings: string; projectSettings: string;
  terminal: string; notifications: string; toggleSidebar: string; addFeature: string; addContextFile: string;
  startNext: string; newSession: string; openProject: string; projectPicker: string; cyclePrevProject: string;
  cycleNextProject: string; splitTerminalRight: string; splitTerminalDown: string; closeTerminal: string;
}

export interface MCPToolInfo { name: string; description?: string; inputSchema?: Record<string, unknown>; enabled: boolean; }
export interface MCPServerConfig { id: string; name: string; description?: string; type?: 'stdio' | 'sse' | 'http'; command?: string; args?: string[]; env?: Record<string, string>; url?: string; headers?: Record<string, string>; enabled?: boolean; tools?: MCPToolInfo[]; toolsLastFetched?: string; }

export interface ProjectRef { id: string; name: string; path: string; lastOpened?: string; theme?: string; fontFamilySans?: string; fontFamilyMono?: string; isFavorite?: boolean; icon?: string; customIconPath?: string; }
export interface TrashedProjectRef extends ProjectRef { trashedAt: string; deletedFromDisk?: boolean; }

export interface GlobalSettings {
  version: number;
  setupComplete: boolean;
  isFirstRun: boolean;
  skipClaudeSetup: boolean;
  theme: ThemeMode;
  fontFamilySans?: string;
  fontFamilyMono?: string;
  editorFontSize?: number;
  sidebarOpen: boolean;
  sidebarStyle: SidebarStyle;
  collapsedNavSections?: Record<string, boolean>;
  chatHistoryOpen: boolean;
  maxConcurrency: number;
  defaultSkipTests: boolean;
  enableDependencyBlocking: boolean;
  skipVerificationInAutoMode: boolean;
  useWorktrees: boolean;
  defaultPlanningMode: PlanningMode;
  defaultRequirePlanApproval: boolean;
  defaultFeatureModel: PhaseModelEntry;
  muteDoneSound: boolean;
  disableSplashScreen: boolean;
  serverLogLevel?: ServerLogLevel;
  enableRequestLogging?: boolean;
  enableAiCommitMessages: boolean;
  phaseModels: PhaseModelConfig;
  defaultThinkingLevel?: ThinkingLevel;
  defaultReasoningEffort?: ReasoningEffort;
  defaultMaxTurns?: number;
  enabledGeminiModels?: GeminiModelId[];
  geminiDefaultModel?: GeminiModelId;
  disabledProviders?: string[];
  keyboardShortcuts: KeyboardShortcuts;
  projects: ProjectRef[];
  trashedProjects: TrashedProjectRef[];
  currentProjectId: string | null;
  projectHistory: string[];
  projectHistoryIndex: number;
  lastProjectDir?: string;
  recentFolders: string[];
  worktreePanelCollapsed: boolean;
  lastSelectedSessionByProject: Record<string, string>;
  autoLoadClaudeMd?: boolean;
  useClaudeCodeSystemPrompt?: boolean;
  codexAutoLoadAgents?: boolean;
  codexSandboxMode?: CodexSandboxMode;
  codexApprovalPolicy?: CodexApprovalPolicy;
  mcpServers: MCPServerConfig[];
  defaultEditorCommand: string | null;
  defaultTerminalId: string | null;
  promptCustomization?: PromptCustomization;
  enableSkills?: boolean;
  skillsSources?: Array<'user' | 'project'>;
  enableSubagents?: boolean;
  subagentsSources?: Array<'user' | 'project'>;
  customSubagents?: Record<string, any>;
  eventHooks?: EventHook[];
  featureTemplates?: FeatureTemplate[];
  claudeCompatibleProviders?: ClaudeCompatibleProvider[];
  autoModeByWorktree?: Record<string, { maxConcurrency: number; branchName: string | null; }>;
}

export interface Credentials {
  version: number;
  apiKeys: {
    anthropic: string;
    google: string;
    openai: string;
  };
}

export interface BoardBackgroundSettings { imagePath: string | null; cardOpacity: number; columnOpacity: number; columnBorderEnabled: boolean; cardGlassmorphism: boolean; cardBorderEnabled: boolean; cardBorderOpacity: number; hideScrollbar: boolean; }
export interface WorktreeInfo { path: string; branch: string; isMain: boolean; hasChanges?: boolean; }

export interface ProjectSettings {
  version: number;
  theme?: ThemeMode;
  fontFamilySans?: string;
  fontFamilyMono?: string;
  useWorktrees?: boolean;
  currentWorktree?: { path: string | null; branch: string };
  worktrees?: WorktreeInfo[];
  boardBackground?: BoardBackgroundSettings;
  worktreePanelVisible?: boolean;
  testCommand?: string;
  devCommand?: string;
  phaseModelOverrides?: Partial<PhaseModelConfig>;
  defaultFeatureModel?: PhaseModelEntry;
}

export const DEFAULT_PHASE_MODELS: PhaseModelConfig = {
  enhancementModel: { model: 'claude-sonnet' },
  fileDescriptionModel: { model: 'claude-haiku' },
  imageDescriptionModel: { model: 'claude-haiku' },
  validationModel: { model: 'claude-sonnet' },
  specGenerationModel: { model: 'claude-haiku', thinkingLevel: 'adaptive' },
  featureGenerationModel: { model: 'claude-sonnet' },
  backlogPlanningModel: { model: 'claude-sonnet' },
  projectAnalysisModel: { model: 'claude-sonnet' },
  ideationModel: { model: 'claude-sonnet' },
  memoryExtractionModel: { model: 'claude-haiku' },
  commitMessageModel: { model: 'claude-haiku' },
  prDescriptionModel: { model: 'claude-sonnet' },
};

export const SETTINGS_VERSION = 6;
export const CREDENTIALS_VERSION = 1;
export const PROJECT_SETTINGS_VERSION = 2;
export const DEFAULT_MAX_CONCURRENCY = 1;

export const DEFAULT_KEYBOARD_SHORTCUTS: KeyboardShortcuts = {
  board: 'K', agent: 'A', spec: 'D', context: 'C', settings: 'S', projectSettings: 'Shift+S', terminal: 'T', notifications: 'X', toggleSidebar: '`', addFeature: 'N', addContextFile: 'N', startNext: 'G', newSession: 'N', openProject: 'O', projectPicker: 'P', cyclePrevProject: 'Q', cycleNextProject: 'E', splitTerminalRight: 'Alt+D', splitTerminalDown: 'Alt+S', closeTerminal: 'Alt+W',
};

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  version: SETTINGS_VERSION,
  setupComplete: false, isFirstRun: true, skipClaudeSetup: false,
  theme: 'dark', sidebarOpen: true, sidebarStyle: 'unified', collapsedNavSections: {}, chatHistoryOpen: false,
  maxConcurrency: DEFAULT_MAX_CONCURRENCY, defaultSkipTests: true, enableDependencyBlocking: true, skipVerificationInAutoMode: false,
  useWorktrees: true, defaultPlanningMode: 'skip', defaultRequirePlanApproval: false,
  defaultFeatureModel: { model: 'claude-haiku', thinkingLevel: 'adaptive' },
  muteDoneSound: false, disableSplashScreen: false, enableAiCommitMessages: true,
  phaseModels: DEFAULT_PHASE_MODELS, keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
  projects: [], trashedProjects: [], currentProjectId: null, projectHistory: [], projectHistoryIndex: -1,
  recentFolders: [], worktreePanelCollapsed: false, lastSelectedSessionByProject: {},
  autoLoadClaudeMd: true, useClaudeCodeSystemPrompt: true, mcpServers: [], defaultEditorCommand: null, defaultTerminalId: null,
  enableSkills: true, skillsSources: ['user', 'project'], enableSubagents: true, subagentsSources: ['user', 'project'],
  eventHooks: [], featureTemplates: DEFAULT_FEATURE_TEMPLATES, claudeCompatibleProviders: [], autoModeByWorktree: {},
  enabledGeminiModels: getAllGeminiModelIds(),
  geminiDefaultModel: DEFAULT_GEMINI_MODEL,
};

export const DEFAULT_CREDENTIALS: Credentials = {
  version: CREDENTIALS_VERSION,
  apiKeys: { anthropic: '', google: '', openai: '' },
};

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  version: PROJECT_SETTINGS_VERSION,
};
