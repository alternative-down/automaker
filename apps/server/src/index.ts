/**
 * Automaker Backend Server (Web-only Fork)
 *
 * Provides HTTP/WebSocket API for web mode.
 */

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cookie from 'cookie';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';

import { createEventEmitter, type EventEmitter } from './lib/events.js';
import { initAllowedPaths } from '@automaker/platform';
import { createLogger, setLogLevel, LogLevel } from '@automaker/utils';

const logger = createLogger('Server');

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

import { authMiddleware, validateWsConnectionToken, checkRawAuthentication } from './lib/auth.js';
import { requireJsonContentType } from './middleware/require-json-content-type.js';
import { createAuthRoutes } from './routes/auth/index.js';
import { createFsRoutes } from './routes/fs/index.js';
import { createHealthRoutes, createDetailedHandler } from './routes/health/index.js';
import { createAgentRoutes } from './routes/agent/index.js';
import { createSessionsRoutes } from './routes/sessions/index.js';
import { createFeaturesRoutes } from './routes/features/index.js';
import { createAutoModeRoutes } from './routes/auto-mode/index.js';
import { createEnhancePromptRoutes } from './routes/enhance-prompt/index.js';
import { createWorktreeRoutes } from './routes/worktree/index.js';
import { createGitRoutes } from './routes/git/index.js';
import { createSetupRoutes } from './routes/setup/index.js';
import { createModelsRoutes } from './routes/models/index.js';
import { createRunningAgentsRoutes } from './routes/running-agents/index.js';
import { createWorkspaceRoutes } from './routes/workspace/index.js';
import { createTemplatesRoutes } from './routes/templates/index.js';
import {
  createTerminalRoutes,
  isTerminalEnabled,
  isTerminalPasswordRequired,
} from './routes/terminal/index.js';
import { createSettingsRoutes } from './routes/settings/index.js';
import { AgentService } from './services/agent-service.js';
import { FeatureLoader } from './services/feature-loader.js';
import { AutoModeServiceCompat } from './services/auto-mode/index.js';
import { getTerminalService } from './services/terminal-service.js';
import { SettingsService } from './services/settings-service.js';
import { createSpecRegenerationRoutes } from './routes/app-spec/index.js';
import { createClaudeRoutes } from './routes/claude/index.js';
import { createCodexRoutes } from './routes/codex/index.js';
import { createGeminiRoutes } from './routes/gemini/index.js';
import { createGitHubRoutes } from './routes/github/index.js';
import { createContextRoutes } from './routes/context/index.js';
import { createBacklogPlanRoutes } from './routes/backlog-plan/index.js';
import { cleanupStaleValidations } from './routes/github/routes/validation-common.js';
import { createMCPRoutes } from './routes/mcp/index.js';
import { MCPTestService } from './services/mcp-test-service.js';
import { createPipelineRoutes } from './routes/pipeline/index.js';
import { pipelineService } from './services/pipeline-service.js';
import { createIdeationRoutes } from './routes/ideation/index.js';
import { IdeationService } from './services/ideation-service.js';
import { getDevServerService } from './services/dev-server-service.js';
import { eventHookService } from './services/event-hook-service.js';
import { createNotificationsRoutes } from './routes/notifications/index.js';
import { getNotificationService } from './services/notification-service.js';
import { createEventHistoryRoutes } from './routes/event-history/index.js';
import { getEventHistoryService } from './services/event-history-service.js';
import { getTestRunnerService } from './services/test-runner-service.js';
import { createProjectsRoutes } from './routes/projects/index.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3008', 10);
const HOST = process.env.HOST || '0.0.0.0';
const HOSTNAME = process.env.HOSTNAME || 'localhost';
const DATA_DIR = process.env.DATA_DIR || './data';

let requestLoggingEnabled = process.env.ENABLE_REQUEST_LOGGING !== 'false';

export function setRequestLoggingEnabled(enabled: boolean): void {
  requestLoggingEnabled = enabled;
}

export function isRequestLoggingEnabled(): boolean {
  return requestLoggingEnabled;
}

initAllowedPaths();

const app = express();

morgan.token('status-colored', (_req, res) => {
  const status = res.statusCode;
  if (status >= 500) return `\x1b[31m${status}\x1b[0m`;
  if (status >= 400) return `\x1b[33m${status}\x1b[0m`;
  if (status >= 300) return `\x1b[36m${status}\x1b[0m`;
  return `\x1b[32m${status}\x1b[0m`;
});

app.use(
  morgan(':method :url :status-colored', {
    skip: (req) => !requestLoggingEnabled || req.url === '/api/health',
  })
);

function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
      if (allowedOrigins && allowedOrigins.length > 0) {
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
      }
      if (isLocalOrigin(origin)) {
        callback(null, origin);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

const events: EventEmitter = createEventEmitter();
const settingsService = new SettingsService(DATA_DIR);
const agentService = new AgentService(DATA_DIR, events, settingsService);
const featureLoader = new FeatureLoader();
const autoModeService = new AutoModeServiceCompat(events, settingsService, featureLoader);
const mcpTestService = new MCPTestService(settingsService);
const ideationService = new IdeationService(events, settingsService, featureLoader);

getDevServerService().setEventEmitter(events);
getNotificationService().setEventEmitter(events);
const eventHistoryService = getEventHistoryService();
getTestRunnerService().setEventEmitter(events);
eventHookService.initialize(events, settingsService, eventHistoryService, featureLoader);

(async () => {
  let globalSettings = null;
  try {
    globalSettings = await settingsService.getGlobalSettings();
  } catch {
    logger.warn('Failed to load global settings');
  }

  if (globalSettings?.serverLogLevel && LOG_LEVEL_MAP[globalSettings.serverLogLevel]) {
    setLogLevel(LOG_LEVEL_MAP[globalSettings.serverLogLevel]);
  }

  await agentService.initialize();
  
  if (globalSettings?.projects) {
    for (const project of globalSettings.projects) {
      await autoModeService.reconcileFeatureStates(project.path);
    }
  }
})();

app.use('/api', requireJsonContentType);
app.use('/api/health', createHealthRoutes());
app.use('/api/auth', createAuthRoutes());
app.use('/api/setup', createSetupRoutes());
app.use('/api', authMiddleware);
app.get('/api/health/detailed', createDetailedHandler());
app.use('/api/fs', createFsRoutes(events));
app.use('/api/agent', createAgentRoutes(agentService, events));
app.use('/api/sessions', createSessionsRoutes(agentService));
app.use('/api/features', createFeaturesRoutes(featureLoader, settingsService, events, autoModeService));
app.use('/api/auto-mode', createAutoModeRoutes(autoModeService));
app.use('/api/enhance-prompt', createEnhancePromptRoutes(settingsService));
app.use('/api/worktree', createWorktreeRoutes(events, settingsService));
app.use('/api/git', createGitRoutes());
app.use('/api/models', createModelsRoutes());
app.use('/api/spec-regeneration', createSpecRegenerationRoutes(events, settingsService));
app.use('/api/running-agents', createRunningAgentsRoutes(autoModeService));
app.use('/api/workspace', createWorkspaceRoutes());
app.use('/api/templates', createTemplatesRoutes());
app.use('/api/terminal', createTerminalRoutes());
app.use('/api/settings', createSettingsRoutes(settingsService));
app.use('/api/claude', createClaudeRoutes());
app.use('/api/codex', createCodexRoutes());
app.use('/api/gemini', createGeminiRoutes(events));
app.use('/api/github', createGitHubRoutes(events, settingsService));
app.use('/api/context', createContextRoutes(settingsService));
app.use('/api/backlog-plan', createBacklogPlanRoutes(events, settingsService));
app.use('/api/mcp', createMCPRoutes(mcpTestService));
app.use('/api/pipeline', createPipelineRoutes(pipelineService));
app.use('/api/ideation', createIdeationRoutes(events, ideationService, featureLoader));
app.use('/api/notifications', createNotificationsRoutes(getNotificationService()));
app.use('/api/event-history', createEventHistoryRoutes(eventHistoryService, settingsService));
app.use('/api/projects', createProjectsRoutes(featureLoader, autoModeService, settingsService, getNotificationService()));

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
const terminalWss = new WebSocketServer({ noServer: true });
const terminalService = getTerminalService(settingsService);

function authenticateWebSocket(request: import('http').IncomingMessage): boolean {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const query: Record<string, string | undefined> = {};
  url.searchParams.forEach((value, key) => { query[key] = value; });
  const cookies = request.headers.cookie ? cookie.parse(request.headers.cookie) : {};
  return checkRawAuthentication(request.headers as any, query, cookies) || (!!url.searchParams.get('wsToken') && validateWsConnectionToken(url.searchParams.get('wsToken')!));
}

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (!authenticateWebSocket(request)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  if (pathname === '/api/events') {
    wss.handleUpgrade(request, socket, head, (ws) => { wss.emit('connection', ws, request); });
  } else if (pathname === '/api/terminal/ws') {
    terminalWss.handleUpgrade(request, socket, head, (ws) => { terminalWss.emit('connection', ws, request); });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket) => {
  const unsubscribe = events.subscribe((type, payload) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
    }
  });
  ws.on('close', unsubscribe);
  ws.on('error', unsubscribe);
});

terminalWss.on('connection', (ws: WebSocket, req: import('http').IncomingMessage) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('sessionId');
  if (!isTerminalEnabled() || !sessionId) {
    ws.close(4003);
    return;
  }
  const session = terminalService.getSession(sessionId);
  if (!session) {
    ws.close(4004);
    return;
  }
  ws.send(JSON.stringify({ type: 'connected', sessionId, shell: session.shell, cwd: session.cwd }));
  const scrollback = terminalService.getScrollbackAndClearPending(sessionId);
  if (scrollback) ws.send(JSON.stringify({ type: 'scrollback', data: scrollback }));
  const unsubData = terminalService.onData((sid, data) => { if (sid === sessionId && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'data', data })); });
  const unsubExit = terminalService.onExit((sid, exitCode) => { if (sid === sessionId && ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify({ type: 'exit', exitCode })); ws.close(1000); } });
  ws.on('message', (msg) => {
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed.type === 'input') terminalService.write(sessionId, parsed.data);
      if (parsed.type === 'resize') terminalService.resize(sessionId, parsed.cols, parsed.rows);
    } catch {}
  });
  ws.on('close', () => { unsubData(); unsubExit(); });
});

server.listen(PORT, HOST, () => {
  logger.info(`🚀 Automaker Server running on http://${HOSTNAME}:${PORT}`);
});
