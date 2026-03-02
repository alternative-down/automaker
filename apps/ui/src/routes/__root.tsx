import { createRootRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback, useDeferredValue, useRef } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createLogger } from '@automaker/utils/logger';
import { Sidebar } from '@/components/layout/sidebar';
import { ProjectSwitcher } from '@/components/layout/project-switcher';
import {
  FileBrowserProvider,
  useFileBrowser,
  setGlobalFileBrowser,
} from '@/contexts/file-browser-context';
import { useAppStore, getStoredTheme, type ThemeMode } from '@/store/app-store';
import { useSetupStore } from '@/store/setup-store';
import { useAuthStore } from '@/store/auth-store';
import { initializeProject } from '@/lib/project-init';
import {
  initApiKey,
  verifySession,
  checkSandboxEnvironment,
  getServerUrlSync,
  getHttpApiClient,
  handleServerOffline,
} from '@/lib/http-api-client';
import {
  hydrateStoreFromSettings,
  parseLocalStorageSettings,
  signalMigrationComplete,
  performSettingsMigration,
} from '@/hooks/use-settings-migration';
import { queryClient } from '@/lib/query-client';
import { createIDBPersister, PERSIST_MAX_AGE_MS, PERSIST_THROTTLE_MS } from '@/lib/query-persist';
import { Toaster } from 'sonner';
import { themeOptions } from '@/config/theme-options';
import { SandboxRiskDialog } from '@/components/dialogs/sandbox-risk-dialog';
import { SandboxRejectionScreen } from '@/components/dialogs/sandbox-rejection-screen';
import { LoadingState } from '@/components/ui/loading-state';
import { useProjectSettingsLoader } from '@/hooks/use-project-settings-loader';
import { useIsCompact } from '@/hooks/use-media-query';
import type { GlobalSettings } from '@automaker/types';
import { syncUICache, restoreFromUICache } from '@/store/ui-cache-store';
import { setItem } from '@/lib/storage';

const logger = createLogger('RootLayout');
const idbPersister = createIDBPersister();

const persistOptions = {
  persister: idbPersister,
  maxAge: PERSIST_MAX_AGE_MS,
  throttleTime: PERSIST_THROTTLE_MS,
  buster: typeof __APP_BUILD_HASH__ !== 'undefined' ? __APP_BUILD_HASH__ : '',
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { state: { status: string } }) =>
      query.state.status === 'success',
  },
};

function applyStoredTheme(): void {
  const storedTheme = getStoredTheme();
  if (storedTheme) {
    const root = document.documentElement;
    const themeClasses = themeOptions.map((option) => option.value);
    root.classList.remove(...themeClasses);
    if (storedTheme === 'dark') root.classList.add('dark');
    else if (storedTheme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(isDark ? 'dark' : 'light');
    } else if (storedTheme !== 'light') root.classList.add(storedTheme);
    else root.classList.add('light');
  }
}

applyStoredTheme();

function RootLayoutContent() {
  const location = useLocation();
  const projects = useAppStore((s) => s.projects);
  const currentProject = useAppStore((s) => s.currentProject);
  const sidebarStyle = useAppStore((s) => s.sidebarStyle);
  const theme = useAppStore((s) => s.theme);
  const getEffectiveTheme = useAppStore((s) => s.getEffectiveTheme);
  
  const setupComplete = useSetupStore((s) => s.setupComplete);
  const authChecked = useAuthStore((s) => s.authChecked);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const settingsLoaded = useAuthStore((s) => s.settingsLoaded);
  const navigate = useNavigate();

  useProjectSettingsLoader();

  const isSetupRoute = location.pathname === '/setup';
  const isLoginRoute = location.pathname === '/login';
  const isDashboardRoute = location.pathname === '/dashboard';

  useEffect(() => {
    restoreFromUICache((state) => useAppStore.setState(state));
    initApiKey();
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/logged-out') {
      navigate({ to: '/login' });
    }
  }, [authChecked, isAuthenticated, location.pathname, navigate]);

  if (!authChecked || (isAuthenticated && !settingsLoaded && !isLoginRoute)) {
    return <LoadingState message="Loading Automaker..." />;
  }

  return (
    <>
      <main className="flex h-full overflow-hidden" data-testid="app-container">
        {sidebarStyle === 'discord' && <ProjectSwitcher />}
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </div>
        <Toaster richColors position="bottom-right" />
      </main>
    </>
  );
}

function RootLayout() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <FileBrowserProvider>
        <RootLayoutContent />
      </FileBrowserProvider>
    </PersistQueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
