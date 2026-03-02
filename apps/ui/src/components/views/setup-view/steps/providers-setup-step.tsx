import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useSetupStore } from '@/store/setup-store';
import { useAppStore } from '@/store/app-store';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Key,
  ExternalLink,
  RefreshCw,
  XCircle,
  Trash2,
  AlertTriangle,
  Terminal,
  AlertCircle,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AnthropicIcon,
  OpenAIIcon,
  GeminiIcon,
} from '@/components/ui/provider-icon';
import { useTokenSave } from '../hooks';

interface ProvidersSetupStepProps {
  onNext: () => void;
  onBack: () => void;
}

type ProviderTab = 'claude' | 'codex' | 'gemini';

function ClaudeContent() {
  const { claudeCliStatus, claudeAuthStatus, setClaudeAuthStatus } = useSetupStore();
  const { setApiKeys, apiKeys } = useAppStore();
  const [apiKey, setApiKey] = useState('');
  const { isSaving, saveToken } = useTokenSave({
    provider: 'anthropic',
    onSuccess: () => {
      setClaudeAuthStatus({ authenticated: true, method: 'api_key' });
      setApiKeys({ ...apiKeys, anthropic: apiKey });
      toast.success('API key saved!');
    }
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AnthropicIcon className="w-5 h-5" />
          Claude API Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Anthropic API Key</Label>
          <Input 
            type="password" 
            placeholder="sk-ant-..." 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
          />
        </div>
        <Button onClick={() => saveToken(apiKey)} disabled={isSaving || !apiKey.trim()} className="w-full">
          {isSaving ? <Spinner size="sm" /> : 'Save API Key'}
        </Button>
      </CardContent>
    </Card>
  );
}

function CodexContent() {
  const { setCodexAuthStatus } = useSetupStore();
  const { setApiKeys, apiKeys } = useAppStore();
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setApiKeys({ ...apiKeys, openai: apiKey });
    setCodexAuthStatus({ authenticated: true, method: 'api_key' });
    toast.success('OpenAI API key saved!');
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <OpenAIIcon className="w-5 h-5" />
          OpenAI API Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>OpenAI API Key</Label>
          <Input 
            type="password" 
            placeholder="sk-..." 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
          />
        </div>
        <Button onClick={handleSave} disabled={!apiKey.trim()} className="w-full">
          Save API Key
        </Button>
      </CardContent>
    </Card>
  );
}

function GeminiContent() {
  const { setGeminiCliStatus } = useSetupStore();
  const { setApiKeys, apiKeys } = useAppStore();
  const [apiKey, setApiKey] = useState('');

  const handleSave = async () => {
    setApiKeys({ ...apiKeys, google: apiKey });
    setGeminiCliStatus({ installed: true, auth: { authenticated: true, method: 'api_key' } });
    toast.success('Google API key saved!');
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <GeminiIcon className="w-5 h-5" />
          Google Gemini API Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Google API Key</Label>
          <Input 
            type="password" 
            placeholder="AIza..." 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
          />
        </div>
        <Button onClick={handleSave} disabled={!apiKey.trim()} className="w-full">
          Save API Key
        </Button>
      </CardContent>
    </Card>
  );
}

export function ProvidersSetupStep({ onNext, onBack }: ProvidersSetupStepProps) {
  const [activeTab, setActiveTab] = useState<ProviderTab>('claude');

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">AI Provider Setup</h2>
        <p className="text-muted-foreground">Configure your AI providers to continue</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProviderTab)}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="claude" className="py-3"><AnthropicIcon className="w-5 h-5 mr-2" /> Claude</TabsTrigger>
          <TabsTrigger value="codex" className="py-3"><OpenAIIcon className="w-5 h-5 mr-2" /> Codex</TabsTrigger>
          <TabsTrigger value="gemini" className="py-3"><GeminiIcon className="w-5 h-5 mr-2" /> Gemini</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="claude"><ClaudeContent /></TabsContent>
          <TabsContent value="codex"><CodexContent /></TabsContent>
          <TabsContent value="gemini"><GeminiContent /></TabsContent>
        </div>
      </Tabs>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <Button onClick={onNext} className="bg-brand-500 hover:bg-brand-600 text-white">
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
