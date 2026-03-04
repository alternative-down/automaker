/**
 * Settings Sync Hook - Forked for Web-only (Simplified Providers)
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { getHttpApiClient, waitForApiKeyInit } from '@/lib/http-api-client';
import { setItem } from '@/lib/storage';
import { useAppStore, type ThemeMode, THEME_STORAGE_KEY } from '@/store/app-store';
import { useSetupStore } from '@/store/setup-store';
import { useAuthStore } from '@/store/auth-store';
import { sanitizeWorktreeByProject } from '@/lib/settings-utils';
import {
  DEFAULT_MAX_CONCURRENCY,
  DEFAULT_PHASE_MODELS,
  getAllCodexModelIds,
  getAllGeminiModelIds,
  type GlobalSettings,
} from '@automaker/types';

const logger = createLogger('SettingsSync');
const SYNC_DEBOUNCE_MS = 1000;

const SETTINGS_FIELDS_TO_SYNC = [
  'theme',
  'fontFamilySans',
  'fontFamilyMono',
  'sidebarOpen',
  'sidebarStyle',
  'collapsedNavSections',
  'chatHistoryOpen',
  'maxConcurrency',
  'defaultSkipTests',
  'enableDependencyBlocking',
  'skipVerificationInAutoMode',
  'useWorktrees',
  'defaultPlanningMode',
  'defaultRequirePlanApproval',
  'defaultFeatureModel',
  'muteDoneSound',
  'disableSplashScreen',
  'serverLogLevel',
  'enableRequestLogging',
  'enhancementModel',
  'validationModel',
  'phaseModels',
  'enabledCodexModels',
  'codexDefaultModel',
  'enabledGeminiModels',
  'geminiDefaultModel',
  'disabledProviders',
  'autoLoadClaudeMd',
  'useClaudeCodeSystemPrompt',
  'keyboardShortcuts',
  'mcpServers',
  'projects',
  'trashedProjects',
  'currentProjectId',
  'codexAutoLoadAgents',
  'codexSandboxMode',
  'codexApprovalPolicy',
  'defaultMaxTurns',
] as const;

const SETUP_FIELDS_TO_SYNC = ['isFirstRun', 'setupComplete', 'skipClaudeSetup'] as const;

function getSettingsFieldValue(
  field: (typeof SETTINGS_FIELDS_TO_SYNC)[number],
  appState: ReturnType<typeof useAppStore.getState>
): unknown {
  if (field === 'currentProjectId') {
    return appState.currentProject?.id ?? null;
  }
  return appState[field as keyof typeof appState];
}

interface SettingsSyncState {
  loaded: boolean;
  error: string | null;
  syncing: boolean;
}

export function useSettingsSync(): SettingsSyncState {
  const [state, setState] = useState<SettingsSyncState>({
    loaded: false,
    error: null,
    syncing: false,
  });

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authChecked = useAuthStore((s) => s.authChecked);
  const settingsLoaded = useAuthStore((s) => s.settingsLoaded);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRef = useRef<string>('');
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      lastSyncedRef.current = '';
      isInitializedRef.current = false;
      setState({ loaded: false, error: null, syncing: false });
    }
  }, [authChecked, isAuthenticated]);

  const syncToServer = useCallback(async () => {
    try {
      const auth = useAuthStore.getState();
      if (!auth.authChecked || !auth.isAuthenticated || !auth.settingsLoaded) return;

      setState((s) => ({ ...s, syncing: true }));
      const api = getHttpApiClient();
      const appState = useAppStore.getState();

      const updates: Record<string, unknown> = {};
      for (const field of SETTINGS_FIELDS_TO_SYNC) {
        updates[field] = getSettingsFieldValue(field, appState);
      }

      const setupState = useSetupStore.getState();
      for (const field of SETUP_FIELDS_TO_SYNC) {
        updates[field] = setupState[field as keyof typeof setupState];
      }

      const updateHash = JSON.stringify(updates);
      if (updateHash === lastSyncedRef.current) {
        setState((s) => ({ ...s, syncing: false }));
        return;
      }

      const result = await api.settings.updateGlobal(updates);
      if (result.success) {
        lastSyncedRef.current = updateHash;
        setItem('automaker-settings-cache', updateHash);
      }
    } catch (error) {
      logger.error('Failed to sync settings:', error);
    } finally {
      setState((s) => ({ ...s, syncing: false }));
    }
  }, []);

  const scheduleSyncToServer = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => syncToServer(), SYNC_DEBOUNCE_MS);
  }, [syncToServer]);

  useEffect(() => {
    if (!authChecked || !isAuthenticated || !settingsLoaded) return;
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    async function initializeSync() {
      try {
        await waitForApiKeyInit();
        const appState = useAppStore.getState();
        const setupState = useSetupStore.getState();
        const updates: Record<string, unknown> = {};
        for (const field of SETTINGS_FIELDS_TO_SYNC) {
          updates[field] = getSettingsFieldValue(field, appState);
        }
        for (const field of SETUP_FIELDS_TO_SYNC) {
          updates[field] = setupState[field as keyof typeof setupState];
        }
        lastSyncedRef.current = JSON.stringify(updates);
        setState({ loaded: true, error: null, syncing: false });
      } catch (error) {
        setState({ loaded: true, error: (error as Error).message, syncing: false });
      }
    }
    initializeSync();
  }, [authChecked, isAuthenticated, settingsLoaded]);

  return state;
}

export async function forceSyncSettingsToServer(): Promise<boolean> {
  return true;
}
