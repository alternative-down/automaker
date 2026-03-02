import { create } from 'zustand';
import type { GeminiAuthStatus } from '@automaker/types';

// CLI Installation Status
export interface CliStatus {
  installed: boolean;
  path: string | null;
  version: string | null;
  method: string;
  hasApiKey?: boolean;
  error?: string;
}

// GitHub CLI Status
export interface GhCliStatus {
  installed: boolean;
  authenticated: boolean;
  version: string | null;
  path: string | null;
  user: string | null;
  error?: string;
}

// Codex Auth Method
export type CodexAuthMethod =
  | 'api_key_env'
  | 'api_key'
  | 'cli_authenticated'
  | 'none';

// Codex Auth Status
export interface CodexAuthStatus {
  authenticated: boolean;
  method: CodexAuthMethod;
  hasAuthFile?: boolean;
  hasApiKey?: boolean;
  hasEnvApiKey?: boolean;
  error?: string;
}

export type { GeminiAuthStatus };

// Claude Auth Method
export type ClaudeAuthMethod =
  | 'oauth_token_env'
  | 'oauth_token'
  | 'api_key_env'
  | 'api_key'
  | 'credentials_file'
  | 'cli_authenticated'
  | 'none';

// Claude Auth Status
export interface ClaudeAuthStatus {
  authenticated: boolean;
  method: ClaudeAuthMethod;
  hasCredentialsFile?: boolean;
  oauthTokenValid?: boolean;
  apiKeyValid?: boolean;
  hasEnvOAuthToken?: boolean;
  hasEnvApiKey?: boolean;
  error?: string;
}

// Installation Progress
export interface InstallProgress {
  isInstalling: boolean;
  currentStep: string;
  progress: number; // 0-100
  output: string[];
  error?: string;
}

export type SetupStep =
  | 'welcome'
  | 'theme'
  | 'providers'
  | 'claude_detect'
  | 'claude_auth'
  | 'codex'
  | 'gemini'
  | 'github'
  | 'complete';

export interface SetupState {
  isFirstRun: boolean;
  setupComplete: boolean;
  currentStep: SetupStep;
  claudeCliStatus: CliStatus | null;
  claudeAuthStatus: ClaudeAuthStatus | null;
  claudeInstallProgress: InstallProgress;
  claudeIsVerifying: boolean;
  ghCliStatus: GhCliStatus | null;
  codexCliStatus: CliStatus | null;
  codexAuthStatus: CodexAuthStatus | null;
  codexInstallProgress: InstallProgress;
  geminiCliStatus: CliStatus | null;
  geminiAuthStatus: GeminiAuthStatus | null;
  skipClaudeSetup: boolean;
}

export interface SetupActions {
  setCurrentStep: (step: SetupStep) => void;
  setSetupComplete: (complete: boolean) => void;
  completeSetup: () => void;
  resetSetup: () => void;
  setIsFirstRun: (isFirstRun: boolean) => void;
  setClaudeCliStatus: (status: CliStatus | null) => void;
  setClaudeAuthStatus: (status: ClaudeAuthStatus | null) => void;
  setClaudeInstallProgress: (progress: Partial<InstallProgress>) => void;
  resetClaudeInstallProgress: () => void;
  setClaudeIsVerifying: (isVerifying: boolean) => void;
  setGhCliStatus: (status: GhCliStatus | null) => void;
  setCodexCliStatus: (status: CliStatus | null) => void;
  setCodexAuthStatus: (status: CodexAuthStatus | null) => void;
  setCodexInstallProgress: (progress: Partial<InstallProgress>) => void;
  resetCodexInstallProgress: () => void;
  setGeminiCliStatus: (status: CliStatus | null) => void;
  setGeminiAuthStatus: (status: GeminiAuthStatus | null) => void;
  setSkipClaudeSetup: (skip: boolean) => void;
}

const initialInstallProgress: InstallProgress = {
  isInstalling: false,
  currentStep: '',
  progress: 0,
  output: [],
};

const shouldSkipSetup = import.meta.env.VITE_SKIP_SETUP === 'true';

function getInitialSetupComplete(): boolean {
  if (shouldSkipSetup) return true;
  try {
    const raw = localStorage.getItem('automaker-settings-cache');
    if (raw) {
      const parsed = JSON.parse(raw) as { setupComplete?: boolean };
      if (parsed?.setupComplete === true) return true;
    }
  } catch {}
  return false;
}

const initialSetupComplete = getInitialSetupComplete();

const initialState: SetupState = {
  isFirstRun: !shouldSkipSetup && !initialSetupComplete,
  setupComplete: initialSetupComplete,
  currentStep: initialSetupComplete ? 'complete' : 'welcome',
  claudeCliStatus: null,
  claudeAuthStatus: null,
  claudeInstallProgress: { ...initialInstallProgress },
  claudeIsVerifying: false,
  ghCliStatus: null,
  codexCliStatus: null,
  codexAuthStatus: null,
  codexInstallProgress: { ...initialInstallProgress },
  geminiCliStatus: null,
  geminiAuthStatus: null,
  skipClaudeSetup: shouldSkipSetup,
};

export const useSetupStore = create<SetupState & SetupActions>()((set, get) => ({
  ...initialState,
  setCurrentStep: (step) => set({ currentStep: step }),
  setSetupComplete: (complete) => set({ setupComplete: complete, currentStep: complete ? 'complete' : 'welcome' }),
  completeSetup: () => set({ setupComplete: true, currentStep: 'complete' }),
  resetSetup: () => set({ ...initialState, setupComplete: false, currentStep: 'welcome', isFirstRun: false }),
  setIsFirstRun: (isFirstRun) => set({ isFirstRun }),
  setClaudeCliStatus: (status) => set({ claudeCliStatus: status }),
  setClaudeAuthStatus: (status) => set({ claudeAuthStatus: status }),
  setClaudeInstallProgress: (progress) => set({ claudeInstallProgress: { ...get().claudeInstallProgress, ...progress } }),
  resetClaudeInstallProgress: () => set({ claudeInstallProgress: { ...initialInstallProgress } }),
  setClaudeIsVerifying: (isVerifying) => set({ claudeIsVerifying: isVerifying }),
  setGhCliStatus: (status) => set({ ghCliStatus: status }),
  setCodexCliStatus: (status) => set({ codexCliStatus: status }),
  setCodexAuthStatus: (status) => set({ codexAuthStatus: status }),
  setCodexInstallProgress: (progress) => set({ codexInstallProgress: { ...get().codexInstallProgress, ...progress } }),
  resetCodexInstallProgress: () => set({ codexInstallProgress: { ...initialInstallProgress } }),
  setGeminiCliStatus: (status) => set({ geminiCliStatus: status }),
  setGeminiAuthStatus: (status) => set({ geminiAuthStatus: status }),
  setSkipClaudeSetup: (skip) => set({ skipClaudeSetup: skip }),
}));
