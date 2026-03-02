import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Key,
  Bot,
  SquareTerminal,
  Palette,
  Settings2,
  Volume2,
  FlaskConical,
  Workflow,
  Plug,
  MessageSquareText,
  User,
  Shield,
  GitBranch,
  Code2,
  Webhook,
  FileCode2,
  FileText,
} from 'lucide-react';
import {
  AnthropicIcon,
  OpenAIIcon,
  GeminiIcon,
} from '@/components/ui/provider-icon';
import type { SettingsViewId } from '../hooks/use-settings-view';

export interface NavigationItem {
  id: SettingsViewId;
  label: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  subItems?: NavigationItem[];
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const GLOBAL_NAV_GROUPS: NavigationGroup[] = [
  {
    label: 'Model & Prompts',
    items: [
      { id: 'defaults', label: 'Feature Defaults', icon: FlaskConical },
      { id: 'model-defaults', label: 'Model Defaults', icon: Workflow },
      { id: 'worktrees', label: 'Worktrees', icon: GitBranch },
      { id: 'prompts', label: 'Prompt Customization', icon: MessageSquareText },
      { id: 'templates', label: 'Templates', icon: FileText },
      { id: 'api-keys', label: 'API Keys', icon: Key },
      {
        id: 'providers',
        label: 'AI Providers',
        icon: Bot,
        subItems: [
          { id: 'claude-provider', label: 'Claude', icon: AnthropicIcon },
          { id: 'codex-provider', label: 'Codex', icon: OpenAIIcon },
          { id: 'gemini-provider', label: 'Gemini', icon: GeminiIcon },
        ],
      },
      { id: 'mcp-servers', label: 'MCP Servers', icon: Plug },
    ],
  },
  {
    label: 'Interface',
    items: [
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'editor', label: 'File Editor', icon: FileCode2 },
      { id: 'terminal', label: 'Terminal', icon: SquareTerminal },
      { id: 'keyboard', label: 'Keyboard Shortcuts', icon: Settings2 },
      { id: 'audio', label: 'Audio', icon: Volume2 },
      { id: 'event-hooks', label: 'Event Hooks', icon: Webhook },
    ],
  },
  {
    label: 'Account & Security',
    items: [
      { id: 'account', label: 'Account', icon: User },
      { id: 'security', label: 'Security', icon: Shield },
    ],
  },
  {
    label: 'Advanced',
    items: [{ id: 'developer', label: 'Developer', icon: Code2 }],
  },
];

export const GLOBAL_NAV_ITEMS: NavigationItem[] = GLOBAL_NAV_GROUPS.flatMap((group) => group.items);
export const NAV_ITEMS: NavigationItem[] = GLOBAL_NAV_ITEMS;
