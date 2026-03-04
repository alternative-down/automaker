import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { getHttpApiClient } from '@/lib/http-api-client';

const logger = createLogger('DefaultEditor');

export function useDefaultEditor() {
  const [defaultEditorName, setDefaultEditorName] = useState<string>('Editor');

  const fetchDefaultEditor = useCallback(async () => {
    try {
      const api = getHttpApiClient();
      if (!api?.worktree?.getDefaultEditor) {
        return;
      }
      const result = await api.worktree.getDefaultEditor();
      if (result.success && result.result?.editorName) {
        setDefaultEditorName(result.result.editorName);
      }
    } catch (error) {
      logger.error('Failed to fetch default editor:', error);
    }
  }, []);

  useEffect(() => {
    fetchDefaultEditor();
  }, [fetchDefaultEditor]);

  return {
    defaultEditorName,
  };
}
