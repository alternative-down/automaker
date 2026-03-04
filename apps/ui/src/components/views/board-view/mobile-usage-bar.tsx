import { useEffect, useCallback, useState, type ComponentType, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { useAppStore } from '@/store/app-store';
import { AnthropicIcon, OpenAIIcon, GeminiIcon } from '@/components/ui/provider-icon';
import { getHttpApiClient } from '@/lib/http-api-client';
import {
  getExpectedWeeklyPacePercentage,
  getExpectedCodexPacePercentage,
  getPaceStatusLabel,
} from '@/store/utils/usage-utils';

interface MobileUsageBarProps {
  showClaudeUsage: boolean;
  showCodexUsage: boolean;
  showGeminiUsage?: boolean;
}

// Helper to get progress bar color based on percentage
function getProgressBarColor(percentage: number): string {
  if (percentage >= 80) return 'bg-red-500';
  if (percentage >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}


// Individual usage bar component
function UsageBar({
  label,
  percentage,
  isStale,
  details,
  resetText,
  pacePercentage,
}: {
  label: string;
  percentage: number;
  isStale: boolean;
  details?: string;
  resetText?: string;
  pacePercentage?: number | null;
}) {
  const paceLabel = pacePercentage != null ? getPaceStatusLabel(percentage, pacePercentage) : null;

  return (
    <div className="mt-1.5 first:mt-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {label}
        </span>
        <span
          className={cn(
            'text-[10px] font-mono font-bold',
            percentage >= 80
              ? 'text-red-500'
              : percentage >= 50
                ? 'text-yellow-500'
                : 'text-green-500'
          )}
        >
          {Math.round(percentage)}%
        </span>
      </div>
      <div
        className={cn(
          'relative h-1 w-full bg-muted-foreground/10 rounded-full overflow-hidden transition-opacity',
          isStale && 'opacity-60'
        )}
      >
        <div
          className={cn('h-full transition-all duration-500', getProgressBarColor(percentage))}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
        {pacePercentage != null && pacePercentage > 0 && pacePercentage < 100 && (
          <div
            className="absolute top-0 h-full w-0.5 bg-foreground/60"
            style={{ left: `${pacePercentage}%` }}
            title={`Expected: ${Math.round(pacePercentage)}%`}
          />
        )}
      </div>
      {(details || resetText || paceLabel) && (
        <div className="flex items-center justify-between mt-0.5">
          {paceLabel ? (
            <span
              className={cn(
                'text-[9px]',
                percentage > (pacePercentage ?? 0) ? 'text-orange-500' : 'text-green-500'
              )}
            >
              {paceLabel}
            </span>
          ) : details ? (
            <span className="text-[9px] text-muted-foreground">{details}</span>
          ) : (
            <span />
          )}
          {resetText && (
            <span className="text-[9px] text-muted-foreground ml-auto">{resetText}</span>
          )}
        </div>
      )}
    </div>
  );
}

// Container for a provider's usage info
function UsageItem({
  icon: Icon,
  label,
  isLoading,
  onRefresh,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  isLoading: boolean;
  onRefresh: () => void;
  children: ReactNode;
}) {
  return (
    <div className="px-2 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          className="p-1 rounded hover:bg-accent/50 transition-colors"
          title="Refresh usage"
        >
          {isLoading ? (
            <Spinner size="xs" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
      <div className="pl-6 space-y-2">{children}</div>
    </div>
  );
}

export function MobileUsageBar({
  showClaudeUsage,
  showCodexUsage,
  showGeminiUsage = false,
}: MobileUsageBarProps) {
  const { claudeUsage, claudeUsageLastUpdated, setClaudeUsage } = useAppStore();
  const { codexUsage, codexUsageLastUpdated, setCodexUsage } = useAppStore();
  const { geminiUsage, geminiUsageLastUpdated, setGeminiUsage } = useAppStore();
  const [isClaudeLoading, setIsClaudeLoading] = useState(false);
  const [isCodexLoading, setIsCodexLoading] = useState(false);
  const [isGeminiLoading, setIsGeminiLoading] = useState(false);

  // Check if data is stale (older than 2 minutes)
  const isClaudeStale =
    !claudeUsageLastUpdated || Date.now() - claudeUsageLastUpdated > 2 * 60 * 1000;
  const isCodexStale = !codexUsageLastUpdated || Date.now() - codexUsageLastUpdated > 2 * 60 * 1000;
  const isGeminiStale =
    !geminiUsageLastUpdated || Date.now() - geminiUsageLastUpdated > 2 * 60 * 1000;

  const fetchClaudeUsage = useCallback(async () => {
    setIsClaudeLoading(true);
    try {
      const api = getHttpApiClient();
      if (!api.claude) return;
      const data = await api.claude.getUsage();
      if (!('error' in data)) {
        setClaudeUsage(data);
      }
    } catch {
      // Silently fail - usage display is optional
    } finally {
      setIsClaudeLoading(false);
    }
  }, [setClaudeUsage]);

  const fetchCodexUsage = useCallback(async () => {
    setIsCodexLoading(true);
    try {
      const api = getHttpApiClient();
      if (!api.codex) return;
      const data = await api.codex.getUsage();
      if (!('error' in data)) {
        setCodexUsage(data);
      }
    } catch {
      // Silently fail - usage display is optional
    } finally {
      setIsCodexLoading(false);
    }
  }, [setCodexUsage]);

  const fetchGeminiUsage = useCallback(async () => {
    setIsGeminiLoading(true);
    try {
      const api = getHttpApiClient();
      if (!api.gemini) return;
      const data = await api.gemini.getUsage();
      if (!('error' in data)) {
        setGeminiUsage(data, Date.now());
      }
    } catch {
      // Silently fail - usage display is optional
    } finally {
      setIsGeminiLoading(false);
    }
  }, [setGeminiUsage]);

  const getCodexWindowLabel = (durationMins: number) => {
    if (durationMins < 60) return `${durationMins}m Window`;
    if (durationMins < 1440) return `${Math.round(durationMins / 60)}h Window`;
    return `${Math.round(durationMins / 1440)}d Window`;
  };

  // Auto-fetch on mount if data is stale
  useEffect(() => {
    if (showClaudeUsage && isClaudeStale) {
      fetchClaudeUsage();
    }
  }, [showClaudeUsage, isClaudeStale, fetchClaudeUsage]);

  useEffect(() => {
    if (showCodexUsage && isCodexStale) {
      fetchCodexUsage();
    }
  }, [showCodexUsage, isCodexStale, fetchCodexUsage]);

  useEffect(() => {
    if (showGeminiUsage && isGeminiStale) {
      fetchGeminiUsage();
    }
  }, [showGeminiUsage, isGeminiStale, fetchGeminiUsage]);

  // Don't render if there's nothing to show
  if (!showClaudeUsage && !showCodexUsage && !showGeminiUsage) {
    return null;
  }

  return (
    <div className="space-y-2 py-1" data-testid="mobile-usage-bar">
      {showClaudeUsage && (
        <UsageItem
          icon={AnthropicIcon}
          label="Claude"
          isLoading={isClaudeLoading}
          onRefresh={fetchClaudeUsage}
        >
          {claudeUsage ? (
            <>
              <UsageBar
                label="Session"
                percentage={claudeUsage.sessionPercentage}
                isStale={isClaudeStale}
              />
              <UsageBar
                label="Weekly"
                percentage={claudeUsage.weeklyPercentage}
                isStale={isClaudeStale}
                pacePercentage={getExpectedWeeklyPacePercentage(claudeUsage.weeklyResetTime)}
              />
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">Loading usage data...</p>
          )}
        </UsageItem>
      )}

      {showCodexUsage && (
        <UsageItem
          icon={OpenAIIcon}
          label="Codex"
          isLoading={isCodexLoading}
          onRefresh={fetchCodexUsage}
        >
          {codexUsage?.rateLimits ? (
            <>
              {codexUsage.rateLimits.primary && (
                <UsageBar
                  label={getCodexWindowLabel(codexUsage.rateLimits.primary.windowDurationMins)}
                  percentage={codexUsage.rateLimits.primary.usedPercent}
                  isStale={isCodexStale}
                  pacePercentage={getExpectedCodexPacePercentage(
                    codexUsage.rateLimits.primary.resetsAt,
                    codexUsage.rateLimits.primary.windowDurationMins
                  )}
                />
              )}
              {codexUsage.rateLimits.secondary && (
                <UsageBar
                  label={getCodexWindowLabel(codexUsage.rateLimits.secondary.windowDurationMins)}
                  percentage={codexUsage.rateLimits.secondary.usedPercent}
                  isStale={isCodexStale}
                  pacePercentage={getExpectedCodexPacePercentage(
                    codexUsage.rateLimits.secondary.resetsAt,
                    codexUsage.rateLimits.secondary.windowDurationMins
                  )}
                />
              )}
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">Loading usage data...</p>
          )}
        </UsageItem>
      )}

      {showGeminiUsage && (
        <UsageItem
          icon={GeminiIcon}
          label="Gemini"
          isLoading={isGeminiLoading}
          onRefresh={fetchGeminiUsage}
        >
          {geminiUsage ? (
            geminiUsage.authenticated ? (
              geminiUsage.flashQuota || geminiUsage.proQuota ? (
                <>
                  {geminiUsage.flashQuota && (
                    <UsageBar
                      label="Flash"
                      percentage={geminiUsage.flashQuota.usedPercent}
                      isStale={isGeminiStale}
                      resetText={geminiUsage.flashQuota.resetText}
                    />
                  )}
                  {geminiUsage.proQuota && (
                    <UsageBar
                      label="Pro"
                      percentage={geminiUsage.proQuota.usedPercent}
                      isStale={isGeminiStale}
                      resetText={geminiUsage.proQuota.resetText}
                    />
                  )}
                </>
              ) : (
                <div className="text-[10px]">
                  <p className="text-green-500 font-medium">
                    Connected via{' '}
                    {geminiUsage.authMethod === 'cli_login'
                      ? 'CLI Login'
                      : geminiUsage.authMethod === 'api_key'
                        ? 'API Key'
                        : geminiUsage.authMethod}
                  </p>
                  <p className="text-muted-foreground italic mt-0.5">
                    {geminiUsage.error || 'No usage yet'}
                  </p>
                </div>
              )
            ) : (
              <p className="text-[10px] text-yellow-500">Not authenticated</p>
            )
          ) : (
            <p className="text-[10px] text-muted-foreground italic">Loading usage data...</p>
          )}
        </UsageItem>
      )}
    </div>
  );
}
