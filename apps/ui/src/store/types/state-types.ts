import type {
  ModelAlias,
  PlanningMode,
  ModelProvider,
  CodexModelId,
  GeminiModelId,
  PhaseModelConfig,
  PhaseModelKey,
  PhaseModelEntry,
  MCPServerConfig,
  PipelineConfig,
  PipelineStep,
  PromptCustomization,
  ModelDefinition,
  ServerLogLevel,
  EventHook,
  ClaudeApiProfile,
  ClaudeCompatibleProvider,
  SidebarStyle,
  ThinkingLevel,
  ReasoningEffort,
  FeatureTemplate,
} from '@automaker/types';

import type {
  ViewMode,
  ThemeMode,
  BoardViewMode,
  KeyboardShortcuts,
  BackgroundSettings,
} from './ui-types';
import type { ApiKeys } from './settings-types';
import type { ChatMessage, ChatSession } from './chat-types';
import type { TerminalState, TerminalPanelContent, PersistedTerminalState } from './terminal-types';
import type { Feature, ProjectAnalysis } from './project-types';
import type { ClaudeUsage, CodexUsage, GeminiUsage } from './usage-types';

/** Forked Project type (Web-only) */
export interface Project {
  id: string;
  name: string;
  path: string;
  isFavorite?: boolean;
  icon?: string;
  customIconPath?: string;
  theme?: ThemeMode;
  fontSans?: string;
  fontMono?: string;
  claudeApiProfileId?: string | null;
  phaseModelOverrides?: Record<string, PhaseModelEntry>;
  defaultFeatureModel?: PhaseModelEntry;
}

export interface TrashedProject extends Project {
  trashedAt: string;
}

export interface InitScriptState {
  status: 'idle' | 'running' | 'success' | 'failed';
  branch: string;
  output: string[];
  error?: string;
}

export interface AutoModeActivity {
  id: string;
  featureId: string;
  timestamp: Date;
  type: 'start' | 'progress' | 'tool' | 'complete' | 'error' | 'planning' | 'action' | 'verification';
  message: string;
  tool?: string;
}

export interface AppState {
  projects: Project[];
  currentProject: Project | null;
  trashedProjects: TrashedProject[];
  currentView: ViewMode;
  sidebarOpen: boolean;
  sidebarStyle: SidebarStyle;
  collapsedNavSections: Record<string, boolean>;
  theme: ThemeMode;
  fontFamilySans: string | null;
  fontFamilyMono: string | null;
  features: Feature[];
  appSpec: string;
  ipcConnected: boolean;
  apiKeys: ApiKeys;
  chatSessions: ChatSession[];
  currentChatSession: ChatSession | null;
  chatHistoryOpen: boolean;
  autoModeByWorktree: Record<string, {
    isRunning: boolean;
    runningTasks: string[];
    branchName: string | null;
    maxConcurrency?: number;
  }>;
  autoModeActivityLog: AutoModeActivity[];
  maxConcurrency: number;
  boardViewMode: BoardViewMode;
  defaultSkipTests: boolean;
  enableDependencyBlocking: boolean;
  skipVerificationInAutoMode: boolean;
  enableAiCommitMessages: boolean;
  useWorktrees: boolean;
  keyboardShortcuts: KeyboardShortcuts;
  serverLogLevel: ServerLogLevel;
  enableRequestLogging: boolean;
  enhancementModel: ModelAlias;
  validationModel: ModelAlias;
  phaseModels: PhaseModelConfig;
  favoriteModels: string[];
  defaultThinkingLevel: ThinkingLevel;
  defaultReasoningEffort: ReasoningEffort;
  defaultMaxTurns: number;
  enabledCodexModels: CodexModelId[];
  codexDefaultModel: CodexModelId;
  enabledGeminiModels: GeminiModelId[];
  geminiDefaultModel: GeminiModelId;
  disabledProviders: ModelProvider[];
  claudeCompatibleProviders: ClaudeCompatibleProvider[];
  terminalState: TerminalState;
  claudeUsage: ClaudeUsage | null;
  codexUsage: CodexUsage | null;
  geminiUsage: GeminiUsage | null;
  codexModels: Array<{
    id: string;
    label: string;
    description: string;
    hasThinking: boolean;
    supportsVision: boolean;
    tier: 'premium' | 'standard' | 'basic';
    isDefault: boolean;
  }>;
  codexModelsLoading: boolean;
}

export interface AppActions {
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setCurrentView: (view: ViewMode) => void;
  setTheme: (theme: ThemeMode) => void;
  setApiKeys: (keys: Partial<ApiKeys>) => void;
  reset: () => void;
}
