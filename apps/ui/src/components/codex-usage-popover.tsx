import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useSetupStore } from '@/store/setup-store';
import { useCodexUsage } from '@/hooks/queries';
import { getExpectedCodexPacePercentage, getPaceStatusLabel } from '@/store/utils/usage-utils';

function formatResetTime(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff < 3600000) return `Resets in ${Math.ceil(diff / 60000)}m`;
  if (diff < 86400000) return `Resets in ${Math.floor(diff / 3600000)}h ${Math.ceil((diff % 3600000) / 60000)}m`;
  return `Resets ${date.toLocaleDateString()}`;
}

function getWindowLabel(durationMins: number) {
  if (durationMins < 60) return { title: `${durationMins}min Window`, subtitle: 'Rate limit' };
  if (durationMins < 1440) return { title: `${Math.round(durationMins / 60)}h Window`, subtitle: 'Rate limit' };
  return { title: `${Math.round(durationMins / 1440)}d Window`, subtitle: 'Rate limit' };
}

export function CodexUsagePopover() {
  const codexAuthStatus = useSetupStore((state) => state.codexAuthStatus);
  const [open, setOpen] = useState(false);
  const { data: codexUsage, isFetching, error: queryError, dataUpdatedAt, refetch } = useCodexUsage(codexAuthStatus?.authenticated);

  const isStale = useMemo(() => !dataUpdatedAt || Date.now() - dataUpdatedAt > 2 * 60 * 1000, [dataUpdatedAt]);

  const UsageCard = ({ title, subtitle, percentage, resetText, isPrimary = false, stale = false, pacePercentage }: any) => {
    const safePercentage = isFinite(percentage) ? percentage : 0;
    const status = safePercentage >= 75 ? { color: 'text-red-500', icon: XCircle, bg: 'bg-red-500' } : safePercentage >= 50 ? { color: 'text-orange-500', icon: AlertTriangle, bg: 'bg-orange-500' } : { color: 'text-green-500', icon: CheckCircle, bg: 'bg-green-500' };
    const StatusIcon = status.icon;

    return (
      <div className={cn('rounded-xl border bg-card/50 p-4 transition-opacity', isPrimary ? 'border-border/60 shadow-sm' : 'border-border/40', (stale) && 'opacity-50')}>
        <div className="flex items-start justify-between mb-3">
          <div><h4 className={cn('font-semibold', isPrimary ? 'text-sm' : 'text-xs')}>{title}</h4><p className="text-[10px] text-muted-foreground">{subtitle}</p></div>
          <div className="flex items-center gap-1.5"><StatusIcon className={cn('w-3.5 h-3.5', status.color)} /><span className={cn('font-mono font-bold', status.color, isPrimary ? 'text-base' : 'text-sm')}>{Math.round(safePercentage)}%</span></div>
        </div>
        <div className="relative h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
          <div className={cn('h-full transition-all duration-500', status.bg)} style={{ width: `${Math.min(safePercentage, 100)}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between">{resetText && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{resetText}</p>}</div>
      </div>
    );
  };

  const maxPercentage = codexUsage?.rateLimits ? Math.max(codexUsage.rateLimits.primary?.usedPercent || 0, codexUsage.rateLimits.secondary?.usedPercent || 0) : 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-3 bg-secondary border border-border px-3">
          <span className="text-sm font-medium">Codex</span>
          {codexUsage?.rateLimits && (
            <div className={cn('h-1.5 w-16 bg-muted-foreground/20 rounded-full overflow-hidden transition-opacity', isStale && 'opacity-60')}>
              <div className={cn('h-full transition-all duration-500', maxPercentage >= 80 ? 'bg-red-500' : maxPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500')} style={{ width: `${Math.min(maxPercentage, 100)}%` }} />
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border shadow-2xl" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/10">
          <span className="text-sm font-semibold">Codex Usage</span>
          <Button variant="ghost" size="icon" className={cn('h-6 w-6', isFetching && 'opacity-80')} onClick={() => !isFetching && refetch()}><RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} /></Button>
        </div>
        <div className="p-4 space-y-4">
          {queryError ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-yellow-500/80" />
              <p className="text-sm font-medium">{(queryError as Error).message}</p>
            </div>
          ) : !codexUsage ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2"><Spinner size="lg" /><p className="text-xs text-muted-foreground">Loading usage data...</p></div>
          ) : codexUsage.rateLimits ? (
            <>
              {codexUsage.rateLimits.primary && <UsageCard title={getWindowLabel(codexUsage.rateLimits.primary.windowDurationMins).title} subtitle="Rate limit" percentage={codexUsage.rateLimits.primary.usedPercent} resetText={formatResetTime(codexUsage.rateLimits.primary.resetsAt)} isPrimary={true} stale={isStale} />}
              {codexUsage.rateLimits.secondary && <UsageCard title={getWindowLabel(codexUsage.rateLimits.secondary.windowDurationMins).title} subtitle="Rate limit" percentage={codexUsage.rateLimits.secondary.usedPercent} resetText={formatResetTime(codexUsage.rateLimits.secondary.resetsAt)} stale={isStale} />}
            </>
          ) : <div className="text-center py-6">No usage data available</div>}
        </div>
        <div className="flex items-center justify-between px-4 py-2 bg-secondary/10 border-t border-border/50">
          <a href="https://platform.openai.com/usage" target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">OpenAI Dashboard <ExternalLink className="w-2.5 h-2.5" /></a>
          <span className="text-[10px] text-muted-foreground">Updates every minute</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
