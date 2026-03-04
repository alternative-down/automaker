/**
 * HTTP API Client for web mode
 */

import { createLogger } from '@automaker/utils/logger';
import type {
  ApiClientContract,
  FileResult,
  WriteResult,
  ReaddirResult,
  StatResult,
  DialogResult,
  SaveImageResult,
  AutoModeAPI,
  FeaturesAPI,
  SpecRegenerationAPI,
  AutoModeEvent,
  SpecRegenerationEvent,
  GitHubAPI,
  IssueValidationInput,
  IssueValidationEvent,
  IdeationAPI,
  IdeaCategory,
  AnalysisSuggestion,
  StartSessionOptions,
  CreateIdeaInput,
  UpdateIdeaInput,
  ConvertToFeatureOptions,
  NotificationsAPI,
  EventHistoryAPI,
  CreatePROptions,
} from './api-client-types';
import type {
  IdeationContextSources,
  EventHistoryFilter,
  IdeationStreamEvent,
  IdeationAnalysisEvent,
  Notification,
} from '@automaker/types';
import type {
  ClaudeUsageResponse,
  CodexUsageResponse,
  GeminiUsage,
} from '@/store/app-store';
import type { ModelId, ThinkingLevel, ReasoningEffort, Feature } from '@automaker/types';
import { getGlobalFileBrowser } from '@/contexts/file-browser-context';

const logger = createLogger('HttpClient');
const NO_STORE_CACHE_MODE: RequestCache = 'no-store';

const getServerUrl = (): string => {
  if (typeof window !== 'undefined') {
    const envUrl = import.meta.env.VITE_SERVER_URL;
    if (envUrl) return envUrl;
    // In deployed web mode, use same-origin and let /api proxy handle backend routing.
    return window.location.origin;
  }
  const hostname = import.meta.env.VITE_HOSTNAME || 'localhost';
  return `http://${hostname}:3008`;
};

export const getServerUrlSync = (): string => getServerUrl();

let cachedSessionToken: string | null = null;
const SESSION_TOKEN_KEY = 'automaker:sessionToken';

const initSessionToken = (): void => {
  if (typeof window === 'undefined') return;
  try {
    cachedSessionToken = window.localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    cachedSessionToken = null;
  }
};

initSessionToken();

export const getSessionToken = (): string | null => cachedSessionToken;

export const setSessionToken = (token: string | null): void => {
  cachedSessionToken = token;
  if (typeof window === 'undefined') return;
  try {
    if (token) {
      window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {}
};

export const clearSessionToken = (): void => {
  cachedSessionToken = null;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {}
};

export const isDesktopMode = (): boolean => false;

export class HttpApiClient implements ApiClientContract {
  private serverUrl: string;
  private ws: WebSocket | null = null;
  private eventCallbacks: Map<EventType, Set<EventCallback>> = new Map();

  constructor() {
    this.serverUrl = getServerUrl();
  }

  private async fetchWsToken(): Promise<string | null> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const sessionToken = getSessionToken();
      if (sessionToken) headers['X-Session-Token'] = sessionToken;

      const response = await fetch(`${this.serverUrl}/api/auth/token`, { headers, credentials: 'include', cache: NO_STORE_CACHE_MODE });
      const data = await response.json();
      return data.success ? data.token : null;
    } catch { return null; }
  }

  private connectWebSocket(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.fetchWsToken().then(token => {
      const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/api/events';
      this.ws = new WebSocket(token ? `${wsUrl}?wsToken=${encodeURIComponent(token)}` : wsUrl);
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const callbacks = this.eventCallbacks.get(data.type);
          if (callbacks) callbacks.forEach(cb => cb(data.payload));
        } catch {}
      };
    });
  }

  private subscribeToEvent(type: EventType, callback: EventCallback): () => void {
    if (!this.eventCallbacks.has(type)) this.eventCallbacks.set(type, new Set());
    this.eventCallbacks.get(type)!.add(callback);
    this.connectWebSocket();
    return () => this.eventCallbacks.get(type)?.delete(callback);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const sessionToken = getSessionToken();
    if (sessionToken) headers['X-Session-Token'] = sessionToken;
    return headers;
  }

  private async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.serverUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.serverUrl}${endpoint}`, {
      headers: this.getHeaders(),
      credentials: 'include',
      cache: NO_STORE_CACHE_MODE,
    });
    return response.json();
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.serverUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  }

  model = {
    getAvailable: () => this.get('/api/models/available'),
    checkProviders: () => this.get('/api/models/providers'),
  };

  setup = {
    getClaudeStatus: () => this.get('/api/setup/claude-status'),
    installClaude: () => this.post('/api/setup/install-claude'),
    authClaude: () => this.post('/api/setup/auth-claude'),
    deauthClaude: () => this.post('/api/setup/deauth-claude'),
    storeApiKey: (provider: string, apiKey: string) => this.post('/api/setup/store-api-key', { provider, apiKey }),
    deleteApiKey: (provider: string) => this.post('/api/setup/delete-api-key', { provider }),
    getApiKeys: () => this.get('/api/setup/api-keys'),
    getPlatform: () => this.get('/api/setup/platform'),
    verifyClaudeAuth: (authMethod?: string, apiKey?: string) => this.post('/api/setup/verify-claude-auth', { authMethod, apiKey }),
    getGhStatus: () => this.get('/api/setup/gh-status'),
    getCodexStatus: () => this.get('/api/setup/codex-status'),
    installCodex: () => this.post('/api/setup/install-codex'),
    authCodex: () => this.post('/api/setup/auth-codex'),
    deauthCodex: () => this.post('/api/setup/deauth-codex'),
    verifyCodexAuth: (authMethod: string, apiKey?: string) => this.post('/api/setup/verify-codex-auth', { authMethod, apiKey }),
    getGeminiStatus: () => this.get('/api/setup/gemini-status'),
    authGemini: () => this.post('/api/setup/auth-gemini'),
    deauthGemini: () => this.post('/api/setup/deauth-gemini'),
  };

  claude = { getUsage: () => this.get('/api/claude/usage') };
  codex = {
    getUsage: () => this.get('/api/codex/usage'),
    getModels: (refresh = false) => this.get(`/api/codex/models${refresh ? '?refresh=true' : ''}`),
  };
  gemini = { getUsage: () => this.get('/api/gemini/usage') };

  agent = {
    start: (sessionId: string, workingDirectory?: string) => this.post('/api/agent/start', { sessionId, workingDirectory }),
    send: (sessionId: string, message: string, workingDirectory?: string, imagePaths?: string[], model?: string, thinkingLevel?: string) =>
      this.post('/api/agent/send', { sessionId, message, workingDirectory, imagePaths, model, thinkingLevel }),
    getHistory: (sessionId: string) => this.post('/api/agent/history', { sessionId }),
    stop: (sessionId: string) => this.post('/api/agent/stop', { sessionId }),
    clear: (sessionId: string) => this.post('/api/agent/clear', { sessionId }),
    onStream: (callback: EventCallback) => this.subscribeToEvent('agent:stream', callback),
  };
}

export function getHttpApiClient(): HttpApiClient {
  return new HttpApiClient();
}

// Compatibility helpers
export function getApiKey(): string | null {
  return null;
}

export async function login(_password?: string): Promise<{ success: boolean }> {
  return { success: true };
}

export async function logout(): Promise<void> {}

export async function verifySession(): Promise<{ authenticated: boolean }> {
  return { authenticated: true };
}

export async function initApiKey(): Promise<void> {}

export async function waitForApiKeyInit(): Promise<void> {}

export async function checkSandboxEnvironment(): Promise<{ sandbox: boolean }> {
  return { sandbox: false };
}

export function handleServerOffline(_error?: unknown): void {}

export function isConnectionError(_error?: unknown): boolean {
  return false;
}
