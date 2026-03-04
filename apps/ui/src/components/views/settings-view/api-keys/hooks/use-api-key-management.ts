import { useState, useEffect } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { useAppStore } from '@/store/app-store';
import { getHttpApiClient } from '@/lib/http-api-client';
import type { ProviderConfigParams } from '@/config/api-providers';

const logger = createLogger('ApiKeyManagement');

interface TestResult {
  success: boolean;
  message: string;
}

interface ApiKeyStatus {
  hasAnthropicKey: boolean;
  hasGoogleKey: boolean;
  hasOpenaiKey: boolean;
}

interface ApiKeyStatusResponse {
  success: boolean;
  hasAnthropicKey: boolean;
  hasGoogleKey: boolean;
  hasOpenaiKey: boolean;
}

export function useApiKeyManagement() {
  const { apiKeys, setApiKeys } = useAppStore();

  const [anthropicKey, setAnthropicKey] = useState<string>(apiKeys.anthropic);
  const [googleKey, setGoogleKey] = useState<string>(apiKeys.google);
  const [openaiKey, setOpenaiKey] = useState<string>(apiKeys.openai);

  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testingGeminiConnection, setTestingGeminiConnection] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<TestResult | null>(null);
  const [testingOpenaiConnection, setTestingOpenaiConnection] = useState(false);
  const [openaiTestResult, setOpenaiTestResult] = useState<TestResult | null>(null);

  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAnthropicKey(apiKeys.anthropic);
    setGoogleKey(apiKeys.google);
    setOpenaiKey(apiKeys.openai);
  }, [apiKeys]);

  useEffect(() => {
    const checkApiKeyStatus = async () => {
      const api = getHttpApiClient();
      if (api?.setup?.getApiKeys) {
        try {
          const status: ApiKeyStatusResponse = await api.setup.getApiKeys();
          if (status.success) {
            setApiKeyStatus({
              hasAnthropicKey: status.hasAnthropicKey,
              hasGoogleKey: status.hasGoogleKey,
              hasOpenaiKey: status.hasOpenaiKey,
            });
          }
        } catch (error) {
          logger.error('Failed to check API key status:', error);
        }
      }
    };
    checkApiKeyStatus();
  }, []);

  const handleTestAnthropicConnection = async (): Promise<void> => {
    if (!anthropicKey || anthropicKey.trim().length === 0) {
      setTestResult({ success: false, message: 'Please enter an API key to test.' });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const api = getHttpApiClient();
      const data = await api.setup.verifyClaudeAuth('api_key', anthropicKey);

      if (data.success && data.authenticated) {
        setTestResult({ success: true, message: 'Connection successful! Claude responded.' });
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to connect to Claude API.' });
      }
    } catch {
      setTestResult({ success: false, message: 'Network error. Please check your connection.' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestGeminiConnection = async (): Promise<void> => {
    setTestingGeminiConnection(true);
    setGeminiTestResult(null);

    if (!googleKey || googleKey.trim().length < 10) {
      setGeminiTestResult({ success: false, message: 'Please enter a valid API key.' });
      setTestingGeminiConnection(false);
      return;
    }

    setGeminiTestResult({ success: true, message: 'API key saved. Connection test not yet available.' });
    setTestingGeminiConnection(false);
  };

  const handleTestOpenaiConnection = async (): Promise<void> => {
    setTestingOpenaiConnection(true);
    setOpenaiTestResult(null);

    try {
      const api = getHttpApiClient();
      const data = await api.setup.verifyCodexAuth('api_key', openaiKey);

      if (data.success && data.authenticated) {
        setOpenaiTestResult({ success: true, message: 'Connection successful! Codex responded.' });
      } else {
        setOpenaiTestResult({ success: false, message: data.error || 'Failed to connect to OpenAI API.' });
      }
    } catch {
      setOpenaiTestResult({ success: false, message: 'Network error. Please check your connection.' });
    } finally {
      setTestingOpenaiConnection(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    setApiKeys({
      anthropic: anthropicKey,
      google: googleKey,
      openai: openaiKey,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const providerConfigParams: ProviderConfigParams = {
    apiKeys,
    anthropic: {
      value: anthropicKey,
      setValue: setAnthropicKey,
      show: showAnthropicKey,
      setShow: setShowAnthropicKey,
      testing: testingConnection,
      onTest: handleTestAnthropicConnection,
      result: testResult,
    },
    google: {
      value: googleKey,
      setValue: setGoogleKey,
      show: showGoogleKey,
      setShow: setShowGoogleKey,
      testing: testingGeminiConnection,
      onTest: handleTestGeminiConnection,
      result: geminiTestResult,
    },
    openai: {
      value: openaiKey,
      setValue: setOpenaiKey,
      show: showOpenaiKey,
      setShow: setShowOpenaiKey,
      testing: testingOpenaiConnection,
      onTest: handleTestOpenaiConnection,
      result: openaiTestResult,
    },
  };

  return {
    providerConfigParams,
    apiKeyStatus,
    handleSave,
    saved,
  };
}
