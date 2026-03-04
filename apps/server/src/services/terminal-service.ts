/**
 * Terminal Service (Forked for Web-only)
 */

import * as pty from 'node-pty';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';
import * as secureFs from '../lib/secure-fs.js';
import { createLogger } from '@automaker/utils';
import type { SettingsService } from './settings-service.js';
import {
  getShellPaths,
} from '@automaker/platform';

const logger = createLogger('Terminal');

export const MIN_MAX_SESSIONS = 1;
export const MAX_MAX_SESSIONS = 50;

export interface TerminalSession {
  id: string;
  pty: pty.IPty;
  cwd: string;
  createdAt: Date;
  shell: string;
  scrollbackBuffer: string;
  outputBuffer: string;
  flushTimeout: NodeJS.Timeout | null;
}

export class TerminalService extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();
  private isWindows = os.platform() === 'win32';
  private maxSessions = 10;

  constructor(private settingsService?: SettingsService) {
    super();
  }

  async createSession(options: any = {}): Promise<TerminalSession | null> {
    const id = `term-${Date.now()}`;
    const shell = options.shell || (this.isWindows ? 'cmd.exe' : '/bin/sh');
    const cwd = options.cwd || os.homedir();

    const ptyOptions: pty.IPtyForkOptions = {
      name: 'xterm-256color',
      cols: options.cols || 80,
      rows: options.rows || 24,
      cwd,
      env: process.env as any,
    };

    if (this.isWindows) {
      (ptyOptions as any).useConpty = false;
    }

    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(shell, [], ptyOptions);
    } catch (e) {
      logger.error('PTY spawn failed:', e);
      return null;
    }

    const session: TerminalSession = {
      id,
      pty: ptyProcess,
      cwd,
      createdAt: new Date(),
      shell,
      scrollbackBuffer: '',
      outputBuffer: '',
      flushTimeout: null,
    };

    this.sessions.set(id, session);

    ptyProcess.onData((data) => {
      session.scrollbackBuffer += data;
      this.emit('data', id, data);
    });

    ptyProcess.onExit(({ exitCode }) => {
      this.sessions.delete(id);
      this.emit('exit', id, exitCode);
    });

    return session;
  }

  write(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.pty.write(data);
    return true;
  }

  resize(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    try {
      session.pty.resize(cols, rows);
      return true;
    } catch {
      return false;
    }
  }

  getSession(sessionId: string) {
    return this.sessions.get(sessionId);
  }

  getScrollbackAndClearPending(sessionId: string) {
    const session = this.sessions.get(sessionId);
    return session?.scrollbackBuffer || null;
  }

  killSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    try {
      session.pty.kill();
    } catch {}
    this.sessions.delete(sessionId);
    return true;
  }

  getAllSessions() {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      cwd: s.cwd,
      shell: s.shell,
      createdAt: s.createdAt,
    }));
  }

  getSessionCount(): number {
    return this.sessions.size;
  }

  getMaxSessions(): number {
    return this.maxSessions;
  }

  setMaxSessions(max: number): void {
    const clamped = Math.min(MAX_MAX_SESSIONS, Math.max(MIN_MAX_SESSIONS, max));
    this.maxSessions = clamped;
  }

  getPlatformInfo() {
    return {
      platform: os.platform(),
      shellPaths: getShellPaths(),
    };
  }

  onData(cb: (sessionId: string, data: string) => void): () => void {
    this.on('data', cb);
    return () => this.off('data', cb);
  }

  onExit(cb: (sessionId: string, exitCode: number) => void): () => void {
    this.on('exit', cb);
    return () => this.off('exit', cb);
  }

  cleanup(): void {
    this.sessions.forEach((s) => s.pty.kill());
    this.sessions.clear();
  }
}

let terminalService: TerminalService | null = null;
export function getTerminalService(settingsService?: SettingsService): TerminalService {
  if (!terminalService) terminalService = new TerminalService(settingsService);
  return terminalService;
}
