import { useState, useCallback, useEffect, useRef } from 'react';
import { getHttpApiClient } from '@/lib/http-api-client';
import { createLogger } from '@automaker/utils/logger';
import type { Message } from '@/store/app-store';

const logger = createLogger('useAgent');

interface UseAgentOptions {
  sessionId: string;
  workingDirectory?: string;
  model?: string;
  thinkingLevel?: string;
  onToolUse?: (toolName: string) => void;
}

export function useAgent({
  sessionId,
  workingDirectory,
  model,
  thinkingLevel,
  onToolUse,
}: UseAgentOptions) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [serverQueue, setServerQueue] = useState<any[]>([]);

  const api = getHttpApiClient();

  // Carregar histórico inicial
  useEffect(() => {
    if (!sessionId) return;

    const loadHistory = async () => {
      try {
        const result = await api.agent.getHistory(sessionId);
        if (result.success && result.messages) {
          setMessages(result.messages);
        }
      } catch (err) {
        logger.error('Failed to load agent history:', err);
      }
    };

    loadHistory();
  }, [sessionId]);

  // Ouvir streams do servidor
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = api.agent.onStream((data: any) => {
      if (data.sessionId !== sessionId) return;

      if (data.type === 'message' || data.type === 'stream') {
        // Lógica simplificada de atualização de mensagens
        api.agent.getHistory(sessionId).then(res => {
          if (res.success) setMessages(res.messages || []);
        });
      }

      if (data.tool && onToolUse) {
        onToolUse(data.tool);
      }
    });

    return () => unsubscribe();
  }, [sessionId, onToolUse]);

  const sendMessage = useCallback(async (content: string, images?: any[], files?: any[]) => {
    if (!sessionId || isProcessing) return;

    setIsProcessing(true);
    try {
      await api.agent.send(sessionId, content, workingDirectory, images, model, thinkingLevel);
    } catch (err) {
      logger.error('Failed to send message:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, isProcessing, workingDirectory, model, thinkingLevel]);

  const stopExecution = useCallback(async () => {
    if (!sessionId) return;
    await api.agent.stop(sessionId);
    setIsProcessing(false);
  }, [sessionId]);

  const clearHistory = useCallback(async () => {
    if (!sessionId) return;
    await api.agent.clear(sessionId);
    setMessages([]);
  }, [sessionId]);

  return {
    messages,
    isProcessing,
    isConnected,
    sendMessage,
    clearHistory,
    stopExecution,
    serverQueue,
    addToServerQueue: async () => {}, // Placeholder
    removeFromServerQueue: () => {},
    clearServerQueue: () => {},
  };
}
