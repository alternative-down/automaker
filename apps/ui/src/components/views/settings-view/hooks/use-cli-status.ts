import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { useSetupStore } from '@/store/setup-store';

const logger = createLogger('CliStatus');

interface CliStatusResult {
  success: boolean;
  status?: string;
  method?: string;
  version?: string;
  path?: string;
  error?: string;
}

export function useCliStatus() {
  const { setClaudeAuthStatus } = useSetupStore();
  const [claudeCliStatus, setClaudeCliStatus] = useState<CliStatusResult | null>(null);
  const [isCheckingClaudeCli, setIsCheckingClaudeCli] = useState(false);

  const refreshAuthStatus = useCallback(async () => {
    // Web-only: Auth status is managed via API keys in the store
    // This is a placeholder for future API-based status checks
  }, []);

  const handleRefreshClaudeCli = useCallback(async () => {
    setIsCheckingClaudeCli(true);
    // Web-only: Placeholder
    setIsCheckingClaudeCli(false);
  }, []);

  return {
    claudeCliStatus,
    isCheckingClaudeCli,
    handleRefreshClaudeCli,
  };
}
