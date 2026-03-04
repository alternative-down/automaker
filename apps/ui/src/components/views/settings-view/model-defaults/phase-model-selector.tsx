import React from 'react';
import { cn } from '@/lib/utils';
import type { PhaseModelEntry } from '@automaker/types';

interface PhaseModelSelectorProps {
  label?: string;
  description?: string;
  value: PhaseModelEntry;
  onChange: (value: PhaseModelEntry) => void;
  compact?: boolean;
  align?: 'start' | 'end';
  disabled?: boolean;
  className?: string;
}

export function PhaseModelSelector({
  label,
  description,
  value,
  onChange,
  compact = false,
  align = 'start',
  disabled = false,
  className,
}: PhaseModelSelectorProps) {
  const modelValue = typeof value === 'string' ? value : value?.model || '';

  return (
    <div className={cn('space-y-1', compact && 'space-y-0.5', className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      {description && <div className="text-xs text-muted-foreground">{description}</div>}
      <input
        className={cn(
          'w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          align === 'end' && 'text-right'
        )}
        value={modelValue}
        disabled={disabled}
        onChange={(e) => onChange({ model: e.target.value })}
        placeholder="Model"
      />
    </div>
  );
}

export default PhaseModelSelector;
