/**
 * Authentication middleware for API security (Forked for Web-only)
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import * as secureFs from './secure-fs.js';
import { createLogger } from '@automaker/utils';

const logger = createLogger('Auth');

const DATA_DIR = process.env.DATA_DIR || './data';
const API_KEY_FILE = path.join(DATA_DIR, '.api-key');
const SESSIONS_FILE = path.join(DATA_DIR, '.sessions');
const SESSION_COOKIE_NAME = 'automaker_session';
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const WS_TOKEN_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

function isEnvTrue(envVar: string | undefined): boolean {
  return envVar === 'true';
}

const validSessions = new Map<string, { createdAt: number; expiresAt: number }>();
const wsConnectionTokens = new Map<string, { createdAt: number; expiresAt: number }>();

setInterval(() => {
  const now = Date.now();
  wsConnectionTokens.forEach((data, token) => {
    if (data.expiresAt <= now) wsConnectionTokens.delete(token);
  });
}, 60 * 1000);

function loadSessions(): void {
  try {
    if (secureFs.existsSync(SESSIONS_FILE)) {
      const data = secureFs.readFileSync(SESSIONS_FILE, 'utf-8') as string;
      const sessions = JSON.parse(data) as Array<[string, { createdAt: number; expiresAt: number }]>;
      const now = Date.now();
      for (const [token, session] of sessions) {
        if (session.expiresAt > now) validSessions.set(token, session);
      }
    }
  } catch (error) {
    logger.warn('Error loading sessions:', error);
  }
}

async function saveSessions(): Promise<void> {
  try {
    await secureFs.mkdir(path.dirname(SESSIONS_FILE), { recursive: true });
    const sessions = Array.from(validSessions.entries());
    await secureFs.writeFile(SESSIONS_FILE, JSON.stringify(sessions), { encoding: 'utf-8', mode: 0o600 });
  } catch (error) {
    logger.error('Failed to save sessions:', error);
  }
}

loadSessions();

function ensureApiKey(): string {
  try {
    if (secureFs.existsSync(API_KEY_FILE)) {
      const key = (secureFs.readFileSync(API_KEY_FILE, 'utf-8') as string).trim();
      if (key) return key;
    }
  } catch (error) {
    logger.warn('Error reading API key file:', error);
  }

  const newKey = crypto.randomUUID();
  try {
    secureFs.mkdirSync(path.dirname(API_KEY_FILE), { recursive: true });
    secureFs.writeFileSync(API_KEY_FILE, newKey, { encoding: 'utf-8', mode: 0o600 });
    logger.info('Generated new API key');
  } catch (error) {
    logger.error('Failed to save API key:', error);
  }
  return newKey;
}

const API_KEY = ensureApiKey();

if (!isEnvTrue(process.env.AUTOMAKER_HIDE_API_KEY)) {
  logger.info(`
🔐 API Key for Web Mode: ${API_KEY}
💡 Set AUTOMAKER_AUTO_LOGIN=true to skip the login prompt.
`);
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(): Promise<string> {
  const token = generateSessionToken();
  const now = Date.now();
  validSessions.set(token, { createdAt: now, expiresAt: now + SESSION_MAX_AGE_MS });
  await saveSessions();
  return token;
}

export function validateSession(token: string): boolean {
  const session = validSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    validSessions.delete(token);
    saveSessions().catch(() => {});
    return false;
  }
  return true;
}

export async function invalidateSession(token: string): Promise<void> {
  validSessions.delete(token);
  await saveSessions();
}

export function createWsConnectionToken(): string {
  const token = generateSessionToken();
  const now = Date.now();
  wsConnectionTokens.set(token, { createdAt: now, expiresAt: now + WS_TOKEN_MAX_AGE_MS });
  return token;
}

export function validateWsConnectionToken(token: string): boolean {
  const tokenData = wsConnectionTokens.get(token);
  if (!tokenData) return false;
  wsConnectionTokens.delete(token);
  return Date.now() <= tokenData.expiresAt;
}

export function validateApiKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const keyBuffer = Buffer.from(key);
  const apiKeyBuffer = Buffer.from(API_KEY);
  if (keyBuffer.length !== apiKeyBuffer.length) {
    crypto.timingSafeEqual(apiKeyBuffer, apiKeyBuffer);
    return false;
  }
  return crypto.timingSafeEqual(keyBuffer, apiKeyBuffer);
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  };
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

type AuthResult = { authenticated: true } | { authenticated: false; errorType: 'invalid_session' | 'no_auth' };

function checkAuthentication(
  headers: Record<string, string | string[] | undefined>,
  query: Record<string, string | undefined>,
  cookies: Record<string, string | undefined>
): AuthResult {
  const token = (headers['x-session-token'] as string) || query.token || cookies[SESSION_COOKIE_NAME];
  if (token && validateSession(token)) return { authenticated: true };
  return { authenticated: false, errorType: 'no_auth' };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (isEnvTrue(process.env.AUTOMAKER_DISABLE_AUTH)) { next(); return; }
  const result = checkAuthentication(req.headers as any, req.query as any, (req.cookies || {}) as any);
  if (result.authenticated) { next(); return; }
  res.status(401).json({ success: false, error: 'Authentication required.' });
}

export function isAuthEnabled(): boolean { return true; }

export function getAuthStatus() {
  const disabled = isEnvTrue(process.env.AUTOMAKER_DISABLE_AUTH);
  return { enabled: !disabled, method: disabled ? 'disabled' : 'session' };
}

export function isRequestAuthenticated(req: Request): boolean {
  if (isEnvTrue(process.env.AUTOMAKER_DISABLE_AUTH)) return true;
  return checkAuthentication(req.headers as any, req.query as any, (req.cookies || {}) as any).authenticated;
}

export function checkRawAuthentication(headers: any, query: any, cookies: any): boolean {
  if (isEnvTrue(process.env.AUTOMAKER_DISABLE_AUTH)) return true;
  return checkAuthentication(headers, query, cookies).authenticated;
}
