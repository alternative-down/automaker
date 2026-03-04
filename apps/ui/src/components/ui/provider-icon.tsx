import type { ComponentType, ImgHTMLAttributes, SVGProps } from 'react';
import { cn } from '@/lib/utils';
import type { AgentModel } from '@automaker/types';
import { getProviderFromModel } from '@/lib/utils';

type ProviderIconKey =
  | 'anthropic'
  | 'openai'
  | 'gemini'
  | 'grok'
  | 'deepseek'
  | 'qwen'
  | 'nova'
  | 'meta'
  | 'mistral'
  | 'bigpickle';

const PROVIDER_COLORS: Record<ProviderIconKey, string> = {
  anthropic: '#d97757',
  openai: '#74aa9c',
  gemini: '#6366F1',
  grok: '#111827',
  deepseek: '#2563EB',
  qwen: '#06B6D4',
  nova: '#FF9900',
  meta: '#2563EB',
  mistral: '#F97316',
  bigpickle: '#4ADE80',
};

export interface ProviderIconProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox'> {
  provider: ProviderIconKey;
  title?: string;
}

export function ProviderIcon({ provider, title, className, ...props }: ProviderIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('inline-block', className)}
      role={title ? 'img' : 'presentation'}
      aria-hidden={!title}
      focusable="false"
      {...props}
    >
      {title && <title>{title}</title>}
      <circle cx="12" cy="12" r="10" fill={PROVIDER_COLORS[provider]} />
    </svg>
  );
}

export const AnthropicIcon = (props: Omit<ProviderIconProps, 'provider'>) => <ProviderIcon provider="anthropic" {...props} />;
export const OpenAIIcon = (props: Omit<ProviderIconProps, 'provider'>) => <ProviderIcon provider="openai" {...props} />;

const GEMINI_ICON_URL = new URL('../../assets/icons/gemini-icon.svg', import.meta.url).toString();
export function GeminiIcon({ title, className, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { title?: string }) {
  return <img src={GEMINI_ICON_URL} alt={title ?? 'Gemini'} className={cn('inline-block', className)} {...props} />;
}

export const GrokIcon = (props: Omit<ProviderIconProps, 'provider'>) => <ProviderIcon provider="grok" {...props} />;
export const DeepSeekIcon = (props: Omit<ProviderIconProps, 'provider'>) => <ProviderIcon provider="deepseek" {...props} />;
export const QwenIcon = (props: Omit<ProviderIconProps, 'provider'>) => <ProviderIcon provider="qwen" {...props} />;
export const NovaIcon = (props: Omit<ProviderIconProps, 'provider'>) => <ProviderIcon provider="nova" {...props} />;
export const MetaIcon = (props: Omit<ProviderIconProps, 'provider'>) => <ProviderIcon provider="meta" {...props} />;
export const MistralIcon = (props: Omit<ProviderIconProps, 'provider'>) => <ProviderIcon provider="mistral" {...props} />;
export const BigPickleIcon = (props: Omit<ProviderIconProps, 'provider'>) => <ProviderIcon provider="bigpickle" {...props} />;

export const PROVIDER_ICON_COMPONENTS: Record<string, ComponentType<{ className?: string }>> = {
  claude: AnthropicIcon,
  codex: OpenAIIcon,
  gemini: GeminiIcon,
  anthropic: AnthropicIcon,
  openai: OpenAIIcon,
  grok: GrokIcon,
  deepseek: DeepSeekIcon,
  qwen: QwenIcon,
  nova: NovaIcon,
  meta: MetaIcon,
  mistral: MistralIcon,
  bigpickle: BigPickleIcon,
};

function getUnderlyingModelIcon(model?: AgentModel | string): ProviderIconKey {
  const modelStr = typeof model === 'string' ? model.toLowerCase() : String(model ?? '').toLowerCase();
  const provider = getProviderFromModel(model as any);

  if (provider === 'claude' || modelStr.includes('claude')) return 'anthropic';
  if (provider === 'codex' || provider === 'openai' || modelStr.includes('gpt') || modelStr.includes('o3')) return 'openai';
  if (provider === 'gemini' || modelStr.includes('gemini')) return 'gemini';
  if (modelStr.includes('grok')) return 'grok';
  if (modelStr.includes('deepseek')) return 'deepseek';
  if (modelStr.includes('qwen')) return 'qwen';
  if (modelStr.includes('nova')) return 'nova';
  if (modelStr.includes('meta') || modelStr.includes('llama')) return 'meta';
  if (modelStr.includes('mistral')) return 'mistral';
  if (modelStr.includes('bigpickle')) return 'bigpickle';

  return 'anthropic';
}

export function getProviderIconForModel(model?: AgentModel | string): ComponentType<{ className?: string }> {
  const iconKey = getUnderlyingModelIcon(model);
  const iconMap: Record<ProviderIconKey, ComponentType<{ className?: string }>> = {
    anthropic: AnthropicIcon,
    openai: OpenAIIcon,
    gemini: GeminiIcon,
    grok: GrokIcon,
    deepseek: DeepSeekIcon,
    qwen: QwenIcon,
    nova: NovaIcon,
    meta: MetaIcon,
    mistral: MistralIcon,
    bigpickle: BigPickleIcon,
  };
  return iconMap[iconKey] ?? AnthropicIcon;
}
