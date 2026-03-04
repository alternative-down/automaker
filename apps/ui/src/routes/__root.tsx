import { createRootRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Sidebar } from '@/components/layout/sidebar';
import { ProjectSwitcher } from '@/components/layout/project-switcher';
import { FileBrowserProvider } from '@/contexts/file-browser-context';
import { useAppStore, getStoredTheme } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { initApiKey, verifySession, handleServerOffline } from '@/lib/http-api-client';
import { queryClient } from '@/lib/query-client';
import { createIDBPersister, PERSIST_MAX_AGE_MS, PERSIST_THROTTLE_MS } from '@/lib/query-persist';
import { Toaster } from 'sonner';
import { themeOptions } from '@/config/theme-options';
import { LoadingState } from '@/components/ui/loading-state';
import { useProjectSettingsLoader } from '@/hooks/use-project-settings-loader';
import { syncUICache, restoreFromUICache } from '@/store/ui-cache-store';

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
  if (!storedTheme) return;

  const root = document.documentElement;
  const themeClasses = themeOptions.map((option) => option.value);
  root.classList.remove(...themeClasses);

  if (storedTheme === 'dark') {
    root.classList.add('dark');
  } else if (storedTheme === 'system') {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.add(isDark ? 'dark' : 'light');
  } else if (storedTheme !== 'light') {
    root.classList.add(storedTheme);
  } else {
    root.classList.add('light');
  }
}

applyStoredTheme();

function RootLayoutContent() {
  const location = useLocation();
  const sidebarStyle = useAppStore((s) => s.sidebarStyle);

  const authChecked = useAuthStore((s) => s.authChecked);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const settingsLoaded = useAuthStore((s) => s.settingsLoaded);
  const setAuthState = useAuthStore((s) => s.setAuthState);
  const navigate = useNavigate();

  useProjectSettingsLoader();

  const isLoginRoute = location.pathname === '/login';

  useEffect(() => {
    restoreFromUICache((state) => useAppStore.setState(state));
    initApiKey();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapAuth = async () => {
      try {
        const session = await verifySession();
        if (cancelled) return;

        if (session?.authenticated) {
          setAuthState({ authChecked: true, isAuthenticated: true, settingsLoaded: true });
          syncUICache();
        } else {
          setAuthState({ authChecked: true, isAuthenticated: false, settingsLoaded: false });
        }
      } catch {
        if (!cancelled) {
          setAuthState({ authChecked: true, isAuthenticated: false, settingsLoaded: false });
          handleServerOffline();
        }
      }
    };

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, [setAuthState]);

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/logged-out') {
      navigate({ to: '/login' });
    }
  }, [authChecked, isAuthenticated, location.pathname, navigate]);

  if (!authChecked || (isAuthenticated && !settingsLoaded && !isLoginRoute)) {
    return <LoadingState message="Loading Automaker..." />;
  }

  // Keep login screen isolated from app shell (no sidebar/background interaction)
  if (isLoginRoute) {
    return (
      <main className="h-full w-full overflow-hidden" data-testid="auth-container">
        <Outlet />
        <Toaster richColors position="bottom-right" />
      </main>
    );
  }

  return (
    <main className="flex h-full overflow-hidden" data-testid="app-container">
      {sidebarStyle === 'discord' && <ProjectSwitcher />}
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
      <Toaster richColors position="bottom-right" />
    </main>
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
