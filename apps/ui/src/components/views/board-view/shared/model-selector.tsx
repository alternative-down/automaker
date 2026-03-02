import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Brain, AlertTriangle, Sparkles } from 'lucide-react';
import { AnthropicIcon, OpenAIIcon, GeminiIcon } from '@/components/ui/provider-icon';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { useSetupStore } from '@/store/setup-store';
import { getModelProvider } from '@automaker/types';
import type { ModelProvider } from '@automaker/types';
import { CLAUDE_MODELS, GEMINI_MODELS, ModelOption } from './model-constants';
import { useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (model: string) => void;
  testIdPrefix?: string;
}

export function ModelSelector({
  selectedModel,
  onModelSelect,
  testIdPrefix = 'model-select',
}: ModelSelectorProps) {
  const {
    codexModels,
    codexModelsLoading,
    codexModelsError,
    fetchCodexModels,
    disabledProviders,
  } = useAppStore();
  const { codexCliStatus } = useSetupStore();

  const selectedProvider = getModelProvider(selectedModel);
  const isCodexAvailable = codexCliStatus?.installed && (codexCliStatus as any).auth?.authenticated;

  useEffect(() => {
    if (isCodexAvailable && codexModels.length === 0 && !codexModelsLoading) {
      fetchCodexModels();
    }
  }, [isCodexAvailable, codexModels.length, codexModelsLoading, fetchCodexModels]);

  const handleProviderChange = (provider: ModelProvider) => {
    if (provider === 'codex') {
      const defaultModelId = codexModels.find((m) => m.isDefault)?.id || 'codex-gpt-5.2-codex';
      onModelSelect(defaultModelId);
    } else if (provider === 'gemini') {
      onModelSelect('gemini-2.5-flash');
    } else {
      onModelSelect('claude-sonnet');
    }
  };

  const providers = [
    { id: 'claude', label: 'Claude', icon: AnthropicIcon },
    { id: 'codex', label: 'Codex', icon: OpenAIIcon },
    { id: 'gemini', label: 'Gemini', icon: GeminiIcon },
  ].filter(p => !disabledProviders.includes(p.id as ModelProvider));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>AI Provider</Label>
        <div className="flex gap-2">
          {providers.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleProviderChange(p.id as ModelProvider)}
              className={cn(
                'flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2',
                selectedProvider === p.id ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'
              )}
            >
              <p.icon className="w-4 h-4" />
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {selectedProvider === 'claude' && (
        <div className="flex gap-2 flex-wrap">
          {CLAUDE_MODELS.map((option) => (
            <button
              key={option.id}
              onClick={() => onModelSelect(option.id)}
              className={cn(
                'flex-1 min-w-[80px] px-3 py-2 rounded-md border text-sm font-medium transition-colors',
                selectedModel === option.id ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'
              )}
            >
              {option.label.replace('Claude ', '')}
            </button>
          ))}
        </div>
      )}

      {selectedProvider === 'gemini' && (
        <div className="flex gap-2 flex-wrap">
          {GEMINI_MODELS.map((option) => (
            <button
              key={option.id}
              onClick={() => onModelSelect(option.id)}
              className={cn(
                'flex-1 min-w-[80px] px-3 py-2 rounded-md border text-sm font-medium transition-colors',
                selectedModel === option.id ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'
              )}
            >
              {option.label.replace('Gemini ', '')}
            </button>
          ))}
        </div>
      )}

      {selectedProvider === 'codex' && (
        <div className="flex flex-col gap-2">
          {codexModels.map((option) => (
            <button
              key={option.id}
              onClick={() => onModelSelect(option.id)}
              className={cn(
                'w-full px-3 py-2 rounded-md border text-sm font-medium flex justify-between',
                selectedModel === option.id ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-accent'
              )}
            >
              <span>{option.label}</span>
              {option.hasThinking && <Badge variant="outline">Thinking</Badge>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
