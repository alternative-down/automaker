import { create } from 'zustand';
import { getHttpApiClient } from '@/lib/http-api-client';
import { createLogger } from '@automaker/utils/logger';
import { UI_SANS_FONT_OPTIONS, UI_MONO_FONT_OPTIONS } from '@/config/ui-font-options';
import { loadFont } from '@/styles/font-imports';
import type {
  PlanningMode,
  ThinkingLevel,
  ReasoningEffort,
  ModelProvider,
  PhaseModelKey,
  PhaseModelEntry,
  ModelDefinition,
  ServerLogLevel,
} from '@automaker/types';
import {
  getAllCodexModelIds,
  getAllGeminiModelIds,
  DEFAULT_PHASE_MODELS,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_MAX_CONCURRENCY,
  DEFAULT_GLOBAL_SETTINGS,
} from '@automaker/types';

import {
  type ViewMode,
  type ThemeMode,
  type BoardViewMode,
  type KeyboardShortcuts,
  type ApiKeys,
  type ChatSession,
  type TerminalState,
  type AppState,
  type AppActions,
  type ClaudeUsage,
  type CodexUsage,
  type GeminiUsage,
} from './types';

import {
  getStoredTheme,
  getStoredFontSans,
  getStoredFontMono,
  DEFAULT_KEYBOARD_SHORTCUTS,
} from './utils';

import { defaultTerminalState } from './defaults';

import {
  getEffectiveFont,
  saveThemeToStorage,
  saveFontSansToStorage,
  saveFontMonoToStorage,
} from './utils/theme-utils';

const logger = createLogger('AppStore');

const initialState: AppState = {
  projects: [],
  currentProject: null,
  trashedProjects: [],
  currentView: 'welcome',
  sidebarOpen: true,
  sidebarStyle: 'unified',
  collapsedNavSections: {},
  theme: getStoredTheme() || 'dark',
  fontFamilySans: getStoredFontSans(),
  fontFamilyMono: getStoredFontMono(),
  features: [],
  appSpec: '',
  ipcConnected: false,
  apiKeys: {
    anthropic: '',
    google: '',
    openai: '',
  },
  chatSessions: [],
  currentChatSession: null,
  maxConcurrency: DEFAULT_MAX_CONCURRENCY,
  boardViewMode: 'kanban',
  defaultSkipTests: true,
  enableDependencyBlocking: true,
  skipVerificationInAutoMode: false,
  enableAiCommitMessages: true,
  useWorktrees: true,
  keyboardShortcuts: DEFAULT_KEYBOARD_SHORTCUTS,
  serverLogLevel: 'info',
  enhancementModel: 'claude-sonnet',
  validationModel: 'claude-opus',
  phaseModels: DEFAULT_PHASE_MODELS,
  favoriteModels: [],
  enabledCodexModels: getAllCodexModelIds(),
  codexDefaultModel: 'codex-gpt-5.2-codex',
  enabledGeminiModels: getAllGeminiModelIds(),
  geminiDefaultModel: DEFAULT_GEMINI_MODEL,
  disabledProviders: [],
  terminalState: defaultTerminalState,
  defaultPlanningMode: 'skip' as PlanningMode,
  defaultFeatureModel: DEFAULT_GLOBAL_SETTINGS.defaultFeatureModel,
  defaultThinkingLevel: DEFAULT_GLOBAL_SETTINGS.defaultThinkingLevel ?? 'adaptive',
  defaultReasoningEffort: DEFAULT_GLOBAL_SETTINGS.defaultReasoningEffort ?? 'none',
  defaultMaxTurns: DEFAULT_GLOBAL_SETTINGS.defaultMaxTurns ?? 10000,
  claudeUsage: null,
  codexUsage: null,
  geminiUsage: null,
  codexModels: [],
  codexModelsLoading: false,
};

export const useAppStore = create<AppState & AppActions>()((set, get) => ({
  ...initialState,

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentView: (view) => set({ currentView: view }),
  setTheme: (theme) => {
    set({ theme });
    saveThemeToStorage(theme);
  },
  setApiKeys: (keys) => set((state) => ({ apiKeys: { ...state.apiKeys, ...keys } })),
  
  // Ações simplificadas para o Fork
  reset: () => set(initialState),
}));
