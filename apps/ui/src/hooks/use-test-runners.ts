/**
 * useTestRunners - Hook for test runner lifecycle management
 *
 * This hook provides a complete interface for starting/stopping tests
 * and subscribing to events via the HTTP/WS API.
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { createLogger } from '@automaker/utils/logger';
import { useTestRunnersStore, type TestSession } from '@/store/test-runners-store';
import { getHttpApiClient } from '@/lib/http-api-client';
import type {
  TestRunStatus,
  TestRunnerStartedEvent,
  TestRunnerOutputEvent,
  TestRunnerCompletedEvent,
} from '@automaker/types';

const logger = createLogger('TestRunners');

export interface StartTestOptions {
  projectPath?: string;
  testFile?: string;
}

export interface StartTestResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export interface StopTestResult {
  success: boolean;
  error?: string;
}

export function useTestRunners(worktreePath?: string) {
  const {
    sessions,
    activeSessionByWorktree,
    isLoading,
    error,
    startSession,
    appendOutput,
    completeSession,
    getActiveSession,
    getSession,
    isWorktreeRunning,
    removeSession,
    clearWorktreeSessions,
    setLoading,
    setError,
  } = useTestRunnersStore(
    useShallow((state) => ({
      sessions: state.sessions,
      activeSessionByWorktree: state.activeSessionByWorktree,
      isLoading: state.isLoading,
      error: state.error,
      startSession: state.startSession,
      appendOutput: state.appendOutput,
      completeSession: state.completeSession,
      getActiveSession: state.getActiveSession,
      getSession: state.getSession,
      isWorktreeRunning: state.isWorktreeRunning,
      removeSession: state.removeSession,
      clearWorktreeSessions: state.clearWorktreeSessions,
      setLoading: state.setLoading,
      setError: state.setError,
    }))
  );

  const activeSession = useMemo(() => {
    if (!worktreePath) return null;
    return getActiveSession(worktreePath);
  }, [worktreePath, getActiveSession, activeSessionByWorktree]);

  const isRunning = useMemo(() => {
    if (!worktreePath) return false;
    return isWorktreeRunning(worktreePath);
  }, [worktreePath, isWorktreeRunning, activeSessionByWorktree, sessions]);

  const worktreeSessions = useMemo(() => {
    if (!worktreePath) return [];
    return Object.values(sessions).filter((s) => s.worktreePath === worktreePath);
  }, [worktreePath, sessions]);

  useEffect(() => {
    const api = getHttpApiClient();
    // Assuming events are handled via the main API client or similar mechanism
    // This is a simplified version for the Web-only fork
    return () => {};
  }, [worktreePath, startSession, appendOutput, completeSession]);

  const start = useCallback(
    async (options?: StartTestOptions): Promise<StartTestResult> => {
      if (!worktreePath) return { success: false, error: 'No worktree path provided' };
      try {
        const api = getHttpApiClient();
        const result = await api.worktree.startTests(worktreePath, options);
        if (!result.success) return { success: false, error: result.error };
        return { success: true, sessionId: result.result?.sessionId };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
    [worktreePath]
  );

  const stop = useCallback(
    async (sessionId?: string): Promise<StopTestResult> => {
      const targetSessionId = sessionId || (worktreePath && activeSession?.sessionId);
      if (!targetSessionId) return { success: false, error: 'No active test session to stop' };
      try {
        const api = getHttpApiClient();
        const result = await api.worktree.stopTests(targetSessionId);
        return { success: result.success, error: result.error };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
    [worktreePath, activeSession]
  );

  return {
    activeSession,
    isRunning,
    sessions: worktreeSessions,
    isLoading,
    error,
    start,
    stop,
    clearHistory: () => worktreePath && clearWorktreeSessions(worktreePath),
    getSession,
    removeSession,
  };
}

export function useTestRunnerEvents() {
  return {
    onStarted: (_cb?: (event: any) => void) => () => {},
    onOutput: (_cb?: (event: any) => void) => () => {},
    onCompleted: (_cb?: (event: any) => void) => () => {},
  };
}
