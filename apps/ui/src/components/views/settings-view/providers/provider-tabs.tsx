import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AnthropicIcon,
  OpenAIIcon,
  GeminiIcon,
} from '@/components/ui/provider-icon';
import { ClaudeSettingsTab } from './claude-settings-tab';
import { CodexSettingsTab } from './codex-settings-tab';
import { GeminiSettingsTab } from './gemini-settings-tab';

interface ProviderTabsProps {
  defaultTab?: 'claude' | 'codex' | 'gemini';
}

export function ProviderTabs({ defaultTab = 'claude' }: ProviderTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="claude" className="flex items-center gap-2">
          <AnthropicIcon className="w-4 h-4" />
          Claude
        </TabsTrigger>
        <TabsTrigger value="codex" className="flex items-center gap-2">
          <OpenAIIcon className="w-4 h-4" />
          Codex
        </TabsTrigger>
        <TabsTrigger value="gemini" className="flex items-center gap-2">
          <GeminiIcon className="w-4 h-4" />
          Gemini
        </TabsTrigger>
      </TabsList>

      <TabsContent value="claude">
        <ClaudeSettingsTab />
      </TabsContent>

      <TabsContent value="codex">
        <CodexSettingsTab />
      </TabsContent>

      <TabsContent value="gemini">
        <GeminiSettingsTab />
      </TabsContent>
    </Tabs>
  );
}

export default ProviderTabs;
