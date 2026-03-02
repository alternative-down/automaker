/**
 * Agent Service - Runs AI agents via provider architecture
 * Manages conversation sessions and streams responses via WebSocket
 */

import path from 'path';
import * as secureFs from '../lib/secure-fs.js';
import type { EventEmitter } from '../lib/events.js';
import type { ExecuteOptions, ThinkingLevel, ReasoningEffort } from '@automaker/types';
import { stripProviderPrefix } from '@automaker/types';
import {
  readImageAsBase64,
  buildPromptWithImages,
  isAbortError,
  loadContextFiles,
  createLogger,
  classifyError,
} from '@automaker/utils';
import { ProviderFactory } from '../providers/provider-factory.js';
import { createChatOptions, validateWorkingDirectory } from '../lib/sdk-options.js';
import type { SettingsService } from './settings-service.js';
import {
  getAutoLoadClaudeMdSetting,
  getUseClaudeCodeSystemPromptSetting,
  filterClaudeMdFromContext,
  getMCPServersFromSettings,
  getPromptCustomization,
  getSkillsConfiguration,
  getSubagentsConfiguration,
  getCustomSubagents,
  getProviderByModelId,
  getDefaultMaxTurnsSetting,
} from '../lib/settings-helpers.js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: Array<{
    data: string;
    mimeType: string;
    filename: string;
  }>;
  timestamp: string;
  isError?: boolean;
}

interface QueuedPrompt {
  id: string;
  message: string;
  imagePaths?: string[];
  model?: string;
  thinkingLevel?: ThinkingLevel;
  addedAt: string;
}

interface Session {
  messages: Message[];
  isRunning: boolean;
  abortController: AbortController | null;
  workingDirectory: string;
  model?: string;
  thinkingLevel?: ThinkingLevel;
  reasoningEffort?: ReasoningEffort;
  sdkSessionId?: string;
  promptQueue: QueuedPrompt[];
}

interface SessionMetadata {
  id: string;
  name: string;
  projectPath?: string;
  workingDirectory: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  tags?: string[];
  model?: string;
  sdkSessionId?: string;
}

export class AgentService {
  private sessions = new Map<string, Session>();
  private stateDir: string;
  private metadataFile: string;
  private events: EventEmitter;
  private settingsService: SettingsService | null = null;
  private logger = createLogger('AgentService');

  constructor(dataDir: string, events: EventEmitter, settingsService?: SettingsService) {
    this.stateDir = path.join(dataDir, 'agent-sessions');
    this.metadataFile = path.join(dataDir, 'sessions-metadata.json');
    this.events = events;
    this.settingsService = settingsService ?? null;
  }

  async initialize(): Promise<void> {
    await secureFs.mkdir(this.stateDir, { recursive: true });
  }

  private isStaleSessionError(rawErrorText: string): boolean {
    const errorLower = rawErrorText.toLowerCase();
    return (
      errorLower.includes('session not found') ||
      errorLower.includes('session expired') ||
      errorLower.includes('invalid session') ||
      errorLower.includes('no such session')
    );
  }

  async startConversation({
    sessionId,
    workingDirectory,
  }: {
    sessionId: string;
    workingDirectory?: string;
  }) {
    let session = await this.ensureSession(sessionId, workingDirectory);
    if (!session) {
      const effectiveWorkingDirectory = workingDirectory || process.cwd();
      const resolvedWorkingDirectory = path.resolve(effectiveWorkingDirectory);
      validateWorkingDirectory(resolvedWorkingDirectory);

      session = {
        messages: [],
        isRunning: false,
        abortController: null,
        workingDirectory: resolvedWorkingDirectory,
        promptQueue: [],
      };
      this.sessions.set(sessionId, session);
    }

    return {
      success: true,
      messages: session.messages,
      sessionId,
    };
  }

  private async ensureSession(
    sessionId: string,
    workingDirectory?: string
  ): Promise<Session | null> {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;

    let metadata: Record<string, SessionMetadata>;
    let messages: Message[];
    try {
      [metadata, messages] = await Promise.all([this.loadMetadata(), this.loadSession(sessionId)]);
    } catch (error) {
      this.logger.error(`Failed to load session ${sessionId} from disk:`, error);
      return null;
    }

    const sessionMetadata = metadata[sessionId];
    if (!sessionMetadata && messages.length === 0) return null;

    const effectiveWorkingDirectory =
      workingDirectory || sessionMetadata?.workingDirectory || process.cwd();
    const resolvedWorkingDirectory = path.resolve(effectiveWorkingDirectory);

    try {
      validateWorkingDirectory(resolvedWorkingDirectory);
    } catch (validationError) {
      return null;
    }

    const promptQueue = await this.loadQueueState(sessionId);

    const session: Session = {
      messages,
      isRunning: false,
      abortController: null,
      workingDirectory: resolvedWorkingDirectory,
      sdkSessionId: sessionMetadata?.sdkSessionId,
      promptQueue,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async sendMessage({
    sessionId,
    message,
    workingDirectory,
    imagePaths,
    model,
    thinkingLevel,
    reasoningEffort,
  }: {
    sessionId: string;
    message: string;
    workingDirectory?: string;
    imagePaths?: string[];
    model?: string;
    thinkingLevel?: ThinkingLevel;
    reasoningEffort?: ReasoningEffort;
  }) {
    const session = await this.ensureSession(sessionId, workingDirectory);
    if (!session) throw new Error(`Session ${sessionId} not found.`);

    if (session.isRunning) throw new Error('Agent is already processing a message');

    if (model) {
      session.model = model;
      await this.updateSession(sessionId, { model });
    }
    if (thinkingLevel !== undefined) session.thinkingLevel = thinkingLevel;
    if (reasoningEffort !== undefined) session.reasoningEffort = reasoningEffort;

    const effectiveModel = model || session.model;
    if (imagePaths && imagePaths.length > 0 && effectiveModel) {
      const supportsVision = ProviderFactory.modelSupportsVision(effectiveModel);
      if (!supportsVision) throw new Error(`Model ${effectiveModel} does not support images.`);
    }

    const images: Message['images'] = [];
    if (imagePaths && imagePaths.length > 0) {
      for (const imagePath of imagePaths) {
        try {
          const imageData = await readImageAsBase64(imagePath);
          images.push({
            data: imageData.base64,
            mimeType: imageData.mimeType,
            filename: imageData.filename,
          });
        } catch (error) {
          this.logger.error(`Failed to load image ${imagePath}:`, error);
        }
      }
    }

    const userMessage: Message = {
      id: this.generateId(),
      role: 'user',
      content: message,
      images: images.length > 0 ? images : undefined,
      timestamp: new Date().toISOString(),
    };

    session.messages.push(userMessage);
    session.isRunning = true;
    session.abortController = new AbortController();

    this.emitAgentEvent(sessionId, { type: 'started' });
    this.emitAgentEvent(sessionId, { type: 'message', message: userMessage });

    await this.saveSession(sessionId, session.messages);

    try {
      const effectiveWorkDir = workingDirectory || session.workingDirectory;
      const autoLoadClaudeMd = await getAutoLoadClaudeMdSetting(effectiveWorkDir, this.settingsService, '[AgentService]');
      let useClaudeCodeSystemPrompt = await getUseClaudeCodeSystemPromptSetting(effectiveWorkDir, this.settingsService, '[AgentService]');

      const mcpServers = await getMCPServersFromSettings(this.settingsService, '[AgentService]');
      const skillsConfig = this.settingsService ? await getSkillsConfiguration(this.settingsService) : { enabled: false, sources: [], shouldIncludeInTools: false };
      const subagentsConfig = this.settingsService ? await getSubagentsConfiguration(this.settingsService) : { enabled: false, sources: [], shouldIncludeInTools: false };
      const customSubagents = this.settingsService && subagentsConfig.enabled ? await getCustomSubagents(this.settingsService, effectiveWorkDir) : undefined;
      const credentials = await this.settingsService?.getCredentials();

      let claudeCompatibleProvider: any;
      let providerResolvedModel: string | undefined;
      const requestedModel = model || session.model;
      if (requestedModel && this.settingsService) {
        const providerResult = await getProviderByModelId(requestedModel, this.settingsService, '[AgentService]');
        if (providerResult.provider) {
          claudeCompatibleProvider = providerResult.provider;
          providerResolvedModel = providerResult.resolvedModel;
        }
      }

      const contextResult = await loadContextFiles({
        projectPath: effectiveWorkDir,
        fsModule: secureFs as any,
        taskContext: { title: message.substring(0, 200), description: message },
      });

      const contextFilesPrompt = filterClaudeMdFromContext(contextResult, autoLoadClaudeMd);
      const baseSystemPrompt = await this.getSystemPrompt();
      const combinedSystemPrompt = contextFilesPrompt ? `${contextFilesPrompt}\n\n${baseSystemPrompt}` : baseSystemPrompt;

      const userMaxTurns = await getDefaultMaxTurnsSetting(this.settingsService, '[AgentService]');

      const sdkOptions = createChatOptions({
        cwd: effectiveWorkDir,
        model: providerResolvedModel || model,
        sessionModel: providerResolvedModel ? undefined : session.model,
        systemPrompt: combinedSystemPrompt,
        abortController: session.abortController!,
        autoLoadClaudeMd,
        useClaudeCodeSystemPrompt,
        thinkingLevel: thinkingLevel ?? session.thinkingLevel,
        maxTurns: userMaxTurns,
        mcpServers: Object.keys(mcpServers).length > 0 ? mcpServers : undefined,
      });

      const bareModel: string = claudeCompatibleProvider ? (requestedModel ?? sdkOptions.model!) : stripProviderPrefix(sdkOptions.model!);
      const provider = ProviderFactory.getProviderForModel(claudeCompatibleProvider ? (requestedModel ?? sdkOptions.model!) : sdkOptions.model!);

      const options: ExecuteOptions = {
        prompt: (await buildPromptWithImages(message, imagePaths, undefined, true)).content,
        model: bareModel,
        originalModel: sdkOptions.model!,
        cwd: effectiveWorkDir,
        systemPrompt: sdkOptions.systemPrompt,
        maxTurns: sdkOptions.maxTurns,
        allowedTools: sdkOptions.allowedTools as string[],
        abortController: session.abortController!,
        conversationHistory: session.messages.slice(0, -1).map(m => ({ role: msg.role, content: msg.content })).filter(m => m.content.trim().length > 0) as any,
        sdkSessionId: session.sdkSessionId,
        mcpServers: Object.keys(mcpServers).length > 0 ? mcpServers : undefined,
        agents: customSubagents,
        thinkingLevel: thinkingLevel ?? session.thinkingLevel,
        reasoningEffort: reasoningEffort ?? session.reasoningEffort,
        credentials,
        claudeCompatibleProvider,
      };

      const stream = provider.executeQuery(options);
      let currentAssistantMessage: Message | null = null;
      let responseText = '';

      for await (const msg of stream) {
        if (msg.session_id && msg.session_id !== session.sdkSessionId) {
          session.sdkSessionId = msg.session_id;
          await this.updateSession(sessionId, { sdkSessionId: msg.session_id });
        }

        if (msg.type === 'assistant') {
          if (msg.message?.content) {
            for (const block of msg.message.content) {
              if (block.type === 'text') {
                responseText += block.text;
                if (!currentAssistantMessage) {
                  currentAssistantMessage = { id: this.generateId(), role: 'assistant', content: responseText, timestamp: new Date().toISOString() };
                  session.messages.push(currentAssistantMessage);
                } else {
                  currentAssistantMessage.content = responseText;
                }
                this.emitAgentEvent(sessionId, { type: 'stream', messageId: currentAssistantMessage.id, content: responseText, isComplete: false });
              }
            }
          }
        } else if (msg.type === 'error') {
          session.isRunning = false;
          session.abortController = null;
          const errorMessage: Message = { id: this.generateId(), role: 'assistant', content: `Error: ${msg.error}`, timestamp: new Date().toISOString(), isError: true };
          session.messages.push(errorMessage);
          await this.saveSession(sessionId, session.messages);
          this.emitAgentEvent(sessionId, { type: 'error', error: msg.error, message: errorMessage });
          return { success: false };
        }
      }

      await this.saveSession(sessionId, session.messages);
      session.isRunning = false;
      session.abortController = null;
      setImmediate(() => this.processNextInQueue(sessionId));

      return { success: true, message: currentAssistantMessage };
    } catch (error) {
      session.isRunning = false;
      session.abortController = null;
      this.logger.error('Error:', error);
      throw error;
    }
  }

  async getHistory(sessionId: string) {
    const session = await this.ensureSession(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    return { success: true, messages: session.messages, isRunning: session.isRunning };
  }

  async stopExecution(sessionId: string) {
    const session = await this.ensureSession(sessionId);
    if (session?.abortController) {
      session.abortController.abort();
      session.isRunning = false;
      session.abortController = null;
    }
    return { success: true };
  }

  async clearSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.messages = [];
      session.isRunning = false;
      session.sdkSessionId = undefined;
      await this.saveSession(sessionId, []);
    }
    await this.clearSdkSessionId(sessionId);
    return { success: true };
  }

  async loadSession(sessionId: string): Promise<Message[]> {
    const sessionFile = path.join(this.stateDir, `${sessionId}.json`);
    try {
      const data = await secureFs.readFile(sessionFile, 'utf-8') as string;
      return JSON.parse(data);
    } catch { return []; }
  }

  async saveSession(sessionId: string, messages: Message[]): Promise<void> {
    const sessionFile = path.join(this.stateDir, `${sessionId}.json`);
    try {
      await secureFs.writeFile(sessionFile, JSON.stringify(messages, null, 2), 'utf-8');
      await this.updateSessionTimestamp(sessionId);
    } catch (error) { this.logger.error('Failed to save session:', error); }
  }

  async loadMetadata(): Promise<Record<string, SessionMetadata>> {
    try {
      const data = await secureFs.readFile(this.metadataFile, 'utf-8') as string;
      return JSON.parse(data);
    } catch { return {}; }
  }

  async saveMetadata(metadata: Record<string, SessionMetadata>): Promise<void> {
    await secureFs.writeFile(this.metadataFile, JSON.stringify(metadata, null, 2), 'utf-8');
  }

  async updateSessionTimestamp(sessionId: string): Promise<void> {
    const metadata = await this.loadMetadata();
    if (metadata[sessionId]) {
      metadata[sessionId].updatedAt = new Date().toISOString();
      await this.saveMetadata(metadata);
    }
  }

  async createSession(name: string, projectPath?: string, workingDirectory?: string, model?: string): Promise<SessionMetadata> {
    const sessionId = this.generateId();
    const metadata = await this.loadMetadata();
    const effectiveWorkingDirectory = path.resolve(workingDirectory || projectPath || process.cwd());
    validateWorkingDirectory(effectiveWorkingDirectory);
    const session: SessionMetadata = { id: sessionId, name, projectPath, workingDirectory: effectiveWorkingDirectory, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), model };
    metadata[sessionId] = session;
    await this.saveMetadata(metadata);
    return session;
  }

  async updateSession(sessionId: string, updates: Partial<SessionMetadata>): Promise<SessionMetadata | null> {
    const metadata = await this.loadMetadata();
    if (!metadata[sessionId]) return null;
    metadata[sessionId] = { ...metadata[sessionId], ...updates, updatedAt: new Date().toISOString() };
    await this.saveMetadata(metadata);
    return metadata[sessionId];
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const metadata = await this.loadMetadata();
    if (!metadata[sessionId]) return false;
    delete metadata[sessionId];
    await this.saveMetadata(metadata);
    try { await secureFs.unlink(path.join(this.stateDir, `${sessionId}.json`)); } catch {}
    this.sessions.delete(sessionId);
    return true;
  }

  async clearSdkSessionId(sessionId: string): Promise<void> {
    const metadata = await this.loadMetadata();
    if (metadata[sessionId]?.sdkSessionId) {
      delete metadata[sessionId].sdkSessionId;
      metadata[sessionId].updatedAt = new Date().toISOString();
      await this.saveMetadata(metadata);
    }
  }

  private async saveQueueState(sessionId: string, queue: QueuedPrompt[]): Promise<void> {
    const queueFile = path.join(this.stateDir, `${sessionId}-queue.json`);
    try { await secureFs.writeFile(queueFile, JSON.stringify(queue, null, 2), 'utf-8'); } catch (error) { this.logger.error('Failed to save queue state:', error); }
  }

  private async loadQueueState(sessionId: string): Promise<QueuedPrompt[]> {
    const queueFile = path.join(this.stateDir, `${sessionId}-queue.json`);
    try {
      const data = await secureFs.readFile(queueFile, 'utf-8') as string;
      return JSON.parse(data);
    } catch { return []; }
  }

  private async processNextInQueue(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.promptQueue.length === 0 || session.isRunning) return;
    const nextPrompt = session.promptQueue.shift();
    if (!nextPrompt) return;
    await this.saveQueueState(sessionId, session.promptQueue);
    try {
      await this.sendMessage({ sessionId, message: nextPrompt.message, imagePaths: nextPrompt.imagePaths, model: nextPrompt.model, thinkingLevel: nextPrompt.thinkingLevel });
    } catch (error) {
      this.logger.error('Failed to process queued prompt:', error);
    }
  }

  private emitAgentEvent(sessionId: string, data: Record<string, unknown>): void {
    this.events.emit('agent:stream', { sessionId, ...data });
  }

  private async getSystemPrompt(): Promise<string> {
    const prompts = await getPromptCustomization(this.settingsService, '[AgentService]');
    return prompts.agent.systemPrompt;
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
