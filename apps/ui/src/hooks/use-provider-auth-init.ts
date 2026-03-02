import { useEffect, useRef, useCallback } from 'react';
import {
  useSetupStore,
  type ClaudeAuthMethod,
  type CodexAuthMethod,
} from '@/store/setup-store';
import type { GeminiAuthStatus } from '@automaker/types';
import { getHttpApiClient } from '@/lib/http-api-client';
import { createLogger } from '@automaker/utils/logger';

const logger = createLogger('ProviderAuthInit');

/**
 * Hook to initialize Claude, Codex, and Gemini authentication statuses on app startup.
 */
export function useProviderAuthInit() {
  const setClaudeAuthStatus = useSetupStore((s) => s.setClaudeAuthStatus);
  const setCodexAuthStatus = useSetupStore((s) => s.setCodexAuthStatus);
  const setGeminiCliStatus = useSetupStore((s) => s.setGeminiCliStatus);
  const setGeminiAuthStatus = useSetupStore((s) => s.setGeminiAuthStatus);
  const initialized = useRef(false);

  const refreshStatuses = useCallback(async () => {
    const api = getHttpApiClient();

    // 1. Claude Auth Status
    try {
      const result = await api.setup.getClaudeStatus();
      if (result.success && result.auth) {
        const auth = result.auth as any;
        const validMethods: ClaudeAuthMethod[] = [
          'oauth_token_env',
          'oauth_token',
          'api_key',
          'api_key_env',
          'credentials_file',
          'cli_authenticated',
          'none',
        ];

        const method = validMethods.includes(auth.method as ClaudeAuthMethod)
          ? (auth.method as ClaudeAuthMethod)
          : ((auth.authenticated ? 'api_key' : 'none') as ClaudeAuthMethod);

        setClaudeAuthStatus({
          authenticated: auth.authenticated,
          method,
          hasCredentialsFile: auth.hasCredentialsFile ?? false,
          oauthTokenValid: !!(auth.oauthTokenValid || auth.hasStoredOAuthToken || auth.hasEnvOAuthToken),
          apiKeyValid: !!(auth.apiKeyValid || auth.hasStoredApiKey || auth.hasEnvApiKey),
          hasEnvOAuthToken: !!auth.hasEnvOAuthToken,
          hasEnvApiKey: !!auth.hasEnvApiKey,
        });
      }
    } catch (error) {
      logger.error('Failed to init Claude auth status:', error);
    }

    // 2. Codex Auth Status
    try {
      const result = await api.setup.getCodexStatus();
      if (result.success && result.auth) {
        const auth = result.auth;
        const validMethods: CodexAuthMethod[] = [
          'api_key_env',
          'api_key',
          'cli_authenticated',
          'none',
        ];

        const method = validMethods.includes(auth.method as CodexAuthMethod)
          ? (auth.method as CodexAuthMethod)
          : ((auth.authenticated ? 'api_key' : 'none') as CodexAuthMethod);

        setCodexAuthStatus({
          authenticated: auth.authenticated,
          method,
          hasAuthFile: auth.hasAuthFile ?? false,
          hasApiKey: auth.hasApiKey ?? false,
          hasEnvApiKey: auth.hasEnvApiKey ?? false,
        });
      }
    } catch (error) {
      logger.error('Failed to init Codex auth status:', error);
    }

    // 3. Gemini Auth Status
    try {
      const result = await api.setup.getGeminiStatus();
      if (result.installed !== undefined || result.version !== undefined || result.path !== undefined) {
        setGeminiCliStatus({
          installed: result.installed ?? false,
          version: result.version,
          path: result.path,
        });
      }

      if (result.success && result.auth) {
        const auth = result.auth;
        const validMethods: GeminiAuthStatus['method'][] = [
          'google_login',
          'api_key',
          'vertex_ai',
          'none',
        ];

        const method = validMethods.includes(auth.method as GeminiAuthStatus['method'])
          ? (auth.method as GeminiAuthStatus['method'])
          : ((auth.authenticated ? 'google_login' : 'none') as GeminiAuthStatus['method']);

        setGeminiAuthStatus({
          authenticated: auth.authenticated,
          method,
          hasApiKey: auth.hasApiKey ?? false,
          hasEnvApiKey: auth.hasEnvApiKey ?? false,
        });
      } else {
        setGeminiAuthStatus({
          authenticated: false,
          method: 'none',
          hasApiKey: false,
          hasEnvApiKey: false,
        });
      }
    } catch (error) {
      logger.error('Failed to init Gemini auth status:', error);
      setGeminiAuthStatus({
        authenticated: false,
        method: 'none',
        hasApiKey: false,
        hasEnvApiKey: false,
      });
    }
  }, [
    setClaudeAuthStatus,
    setCodexAuthStatus,
    setGeminiCliStatus,
    setGeminiAuthStatus,
  ]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void refreshStatuses();
  }, [refreshStatuses]);
}
