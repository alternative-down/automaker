import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { createLogger } from '@automaker/utils/logger';
import { DEFAULT_MAX_CONCURRENCY } from '@automaker/types';
import { useAppStore } from '@/store/app-store';
import { getHttpApiClient } from '@/lib/http-api-client';
import type { WorktreeInfo } from '@/components/views/board-view/worktree-panel/types';

const logger = createLogger('AutoMode');

export function useAutoMode(worktree?: WorktreeInfo) {
  const {
    autoModeByWorktree,
    setAutoModeRunning,
    addRunningTask,
    removeRunningTask,
    currentProject,
    addAutoModeActivity,
    getWorktreeKey,
    getMaxConcurrencyForWorktree,
  } = useAppStore(
    useShallow((state) => ({
      autoModeByWorktree: state.autoModeByWorktree,
      setAutoModeRunning: state.setAutoModeRunning,
      addRunningTask: state.addRunningTask,
      removeRunningTask: state.removeRunningTask,
      currentProject: state.currentProject,
      addAutoModeActivity: state.addAutoModeActivity,
      getWorktreeKey: state.getWorktreeKey,
      getMaxConcurrencyForWorktree: state.getMaxConcurrencyForWorktree,
    }))
  );

  const branchName = useMemo(() => {
    if (!worktree) return null;
    return worktree.isMain ? null : worktree.branch || null;
  }, [worktree]);

  const refreshStatus = useCallback(async () => {
    if (!currentProject) return;
    try {
      const api = getHttpApiClient();
      const result = await api.autoMode.status(currentProject.path, branchName);
      if (result.success) {
        setAutoModeRunning(
          currentProject.id,
          branchName,
          result.isAutoLoopRunning,
          result.maxConcurrency,
          result.runningFeatures
        );
      }
    } catch (error) {
      logger.error('Error syncing auto mode state:', error);
    }
  }, [currentProject, branchName, setAutoModeRunning]);

  const start = useCallback(async () => {
    if (!currentProject) return;
    try {
      const api = getHttpApiClient();
      const currentMaxConcurrency = getMaxConcurrencyForWorktree(currentProject.id, branchName);
      const result = await api.autoMode.start(currentProject.path, branchName, currentMaxConcurrency);
      if (result.success) {
        setAutoModeRunning(currentProject.id, branchName, true, currentMaxConcurrency);
      }
    } catch (error) {
      logger.error('Error starting auto mode:', error);
    }
  }, [currentProject, branchName, setAutoModeRunning, getMaxConcurrencyForWorktree]);

  const stop = useCallback(async () => {
    if (!currentProject) return;
    try {
      const api = getHttpApiClient();
      const result = await api.autoMode.stop(currentProject.path, branchName);
      if (result.success) {
        setAutoModeRunning(currentProject.id, branchName, false);
      }
    } catch (error) {
      logger.error('Error stopping auto mode:', error);
    }
  }, [currentProject, branchName, setAutoModeRunning]);

  return {
    isRunning: currentProject ? !!autoModeByWorktree[getWorktreeKey(currentProject.id, branchName)]?.isRunning : false,
    runningTasks: currentProject ? autoModeByWorktree[getWorktreeKey(currentProject.id, branchName)]?.runningTasks || [] : [],
    start,
    stop,
    refreshStatus,
  };
}
