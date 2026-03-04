import { useState, useEffect, useCallback, useRef } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { getHttpApiClient } from '@/lib/http-api-client';
import type {
  IssueValidationResult,
  IssueValidationEvent,
  StoredValidation,
  LinkedPRInfo,
  PhaseModelEntry,
  ModelId,
} from '@automaker/types';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { isValidationStale } from '../utils';
import { useValidateIssue, useMarkValidationViewed } from '@/hooks/mutations';

const logger = createLogger('IssueValidation');

interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels?: string[];
}

interface UseIssueValidationOptions {
  selectedIssue: GitHubIssue | null;
  showValidationDialog: boolean;
  onValidationResultChange: (result: IssueValidationResult | null) => void;
  onShowValidationDialogChange: (show: boolean) => void;
}

export function useIssueValidation({
  selectedIssue,
  showValidationDialog,
  onValidationResultChange,
  onShowValidationDialogChange,
}: UseIssueValidationOptions) {
  const { currentProject, phaseModels, muteDoneSound } = useAppStore();
  const [validatingIssues, setValidatingIssues] = useState<Set<number>>(new Set());
  const [cachedValidations, setCachedValidations] = useState<Map<number, StoredValidation>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const validateIssueMutation = useValidateIssue(currentProject?.path ?? '');
  const markViewedMutation = useMarkValidationViewed(currentProject?.path ?? '');
  const selectedIssueRef = useRef<GitHubIssue | null>(null);
  const showValidationDialogRef = useRef(false);

  useEffect(() => { selectedIssueRef.current = selectedIssue; }, [selectedIssue]);
  useEffect(() => { showValidationDialogRef.current = showValidationDialog; }, [showValidationDialog]);

  useEffect(() => {
    let isMounted = true;
    const loadCachedValidations = async () => {
      if (!currentProject?.path) return;
      try {
        const api = getHttpApiClient();
        const result = await api.github.getValidations(currentProject.path);
        if (isMounted && result.success && result.validations) {
          const map = new Map<number, StoredValidation>();
          for (const v of result.validations) map.set(v.issueNumber, v);
          setCachedValidations(map);
        }
      } catch (err) {
        if (isMounted) logger.error('Failed to load cached validations:', err);
      }
    };
    loadCachedValidations();
    return () => { isMounted = false; };
  }, [currentProject?.path]);

  useEffect(() => {
    let isMounted = true;
    const loadRunningValidations = async () => {
      if (!currentProject?.path) return;
      try {
        const api = getHttpApiClient();
        const result = await api.github.getValidationStatus(currentProject.path);
        if (isMounted && result.success && result.runningIssues) {
          setValidatingIssues(new Set(result.runningIssues));
        }
      } catch (err) {
        if (isMounted) logger.error('Failed to load running validations:', err);
      }
    };
    loadRunningValidations();
    return () => { isMounted = false; };
  }, [currentProject?.path]);

  useEffect(() => {
    const api = getHttpApiClient();
    const handleValidationEvent = (event: IssueValidationEvent) => {
      if (event.projectPath !== currentProject?.path) return;
      switch (event.type) {
        case 'issue_validation_start':
          setValidatingIssues((prev) => new Set([...prev, event.issueNumber]));
          break;
        case 'issue_validation_complete':
          setValidatingIssues((prev) => {
            const next = new Set(prev);
            next.delete(event.issueNumber);
            return next;
          });
          setCachedValidations((prev) => {
            const next = new Map(prev);
            next.set(event.issueNumber, {
              issueNumber: event.issueNumber,
              issueTitle: event.issueTitle,
              validatedAt: new Date().toISOString(),
              model: event.model,
              result: event.result,
            });
            return next;
          });
          toast.success(`Issue #${event.issueNumber} validated: ${event.result.verdict}`);
          if (!muteDoneSound) {
            if (!audioRef.current) audioRef.current = new Audio('/sounds/ding.mp3');
            audioRef.current.play().catch(() => {});
          }
          if (selectedIssueRef.current?.number === event.issueNumber && showValidationDialogRef.current) {
            onValidationResultChange(event.result);
          }
          break;
        case 'issue_validation_error':
          setValidatingIssues((prev) => {
            const next = new Set(prev);
            next.delete(event.issueNumber);
            return next;
          });
          toast.error(`Validation failed for issue #${event.issueNumber}`, { description: event.error });
          if (selectedIssueRef.current?.number === event.issueNumber && showValidationDialogRef.current) {
            onShowValidationDialogChange(false);
          }
          break;
      }
    };
    const unsubscribe = api.github.onValidationEvent(handleValidationEvent);
    return () => unsubscribe();
  }, [currentProject?.path, muteDoneSound, onValidationResultChange, onShowValidationDialogChange]);

  const handleValidateIssue = useCallback(
    async (issue: GitHubIssue, options: { forceRevalidate?: boolean; modelEntry?: PhaseModelEntry } = {}) => {
      const { forceRevalidate = false, modelEntry } = options;
      if (!currentProject?.path) { toast.error('No project selected'); return; }
      if (validatingIssues.has(issue.number) || validateIssueMutation.isPending) return;

      const cached = cachedValidations.get(issue.number);
      if (cached && !forceRevalidate && !isValidationStale(cached.validatedAt)) {
        onValidationResultChange(cached.result);
        onShowValidationDialogChange(true);
        return;
      }

      const effectiveEntry = modelEntry || phaseModels.validationModel;
      validateIssueMutation.mutate({
        issue,
        model: effectiveEntry.model,
        thinkingLevel: effectiveEntry.thinkingLevel,
        reasoningEffort: effectiveEntry.reasoningEffort,
      });
    },
    [currentProject?.path, validatingIssues, cachedValidations, phaseModels.validationModel, validateIssueMutation, onValidationResultChange, onShowValidationDialogChange]
  );

  const handleViewCachedValidation = useCallback(
    async (issue: GitHubIssue) => {
      const cached = cachedValidations.get(issue.number);
      if (cached) {
        onValidationResultChange(cached.result);
        onShowValidationDialogChange(true);
        if (!cached.viewedAt && currentProject?.path) {
          markViewedMutation.mutate(issue.number, {
            onSuccess: () => {
              setCachedValidations((prev) => {
                const next = new Map(prev);
                const updated = prev.get(issue.number);
                if (updated) next.set(issue.number, { ...updated, viewedAt: new Date().toISOString() });
                return next;
              });
            },
          });
        }
      }
    },
    [cachedValidations, currentProject?.path, markViewedMutation, onValidationResultChange, onShowValidationDialogChange]
  );

  return { validatingIssues, cachedValidations, handleValidateIssue, handleViewCachedValidation, isValidating: validateIssueMutation.isPending };
}
