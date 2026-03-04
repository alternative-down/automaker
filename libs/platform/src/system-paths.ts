/**
 * System Paths Configuration (Forked for Web-only)
 *
 * Centralized configuration for ALL system paths that automaker needs to access.
 */

import os from 'os';
import path from 'path';
import fsSync from 'fs';
import fs from 'fs/promises';

/**
 * Get NVM for Windows (nvm4w) symlink paths for a given CLI tool.
 */
function getNvmWindowsCliPaths(cliName: string): string[] {
  const nvmSymlink = process.env.NVM_SYMLINK;
  if (!nvmSymlink) return [];
  return [path.join(nvmSymlink, `${cliName}.cmd`), path.join(nvmSymlink, cliName)];
}

export function getGitHubCliPaths(): string[] {
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    return [
      path.join(process.env.LOCALAPPDATA || '', 'Programs', 'gh', 'bin', 'gh.exe'),
      path.join(process.env.ProgramFiles || '', 'GitHub CLI', 'gh.exe'),
    ].filter(Boolean);
  }
  return [
    '/opt/homebrew/bin/gh',
    '/usr/local/bin/gh',
    path.join(os.homedir(), '.local', 'bin', 'gh'),
    '/home/linuxbrew/.linuxbrew/bin/gh',
  ];
}

export function getClaudeCliPaths(): string[] {
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return [
      path.join(os.homedir(), '.local', 'bin', 'claude.exe'),
      path.join(appData, 'npm', 'claude.cmd'),
      path.join(appData, 'npm', 'claude'),
      path.join(appData, '.npm-global', 'bin', 'claude.cmd'),
      path.join(appData, '.npm-global', 'bin', 'claude'),
      ...getNvmWindowsCliPaths('claude'),
    ];
  }
  return [
    path.join(os.homedir(), '.local', 'bin', 'claude'),
    path.join(os.homedir(), '.claude', 'local', 'claude'),
    '/usr/local/bin/claude',
    path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
  ];
}

export function getCodexCliPaths(): string[] {
  const isWindows = process.platform === 'win32';
  const homeDir = os.homedir();
  if (isWindows) {
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    return [
      path.join(homeDir, '.local', 'bin', 'codex.exe'),
      path.join(appData, 'npm', 'codex.cmd'),
      ...getNvmWindowsCliPaths('codex'),
    ];
  }
  return [path.join(homeDir, '.local', 'bin', 'codex'), '/usr/local/bin/codex'];
}

export function getClaudeConfigDir(): string {
  return path.join(os.homedir(), '.claude');
}

export function getClaudeSettingsPath(): string {
  return path.join(getClaudeConfigDir(), 'settings.json');
}

export function systemPathExists(filePath: string): boolean {
  return fsSync.existsSync(filePath);
}

export function systemPathIsExecutable(filePath: string): boolean {
  try {
    fsSync.accessSync(filePath, fsSync.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function systemPathReaddirSync(dirPath: string): string[] {
  try {
    return fsSync.readdirSync(dirPath);
  } catch {
    return [];
  }
}

export function systemPathReadFileSync(filePath: string, encoding: BufferEncoding = 'utf8'): string {
  return fsSync.readFileSync(filePath, { encoding });
}

export function getNvmPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, '.nvm', 'versions', 'node')];
}

export function getFnmPaths(): string[] {
  const home = os.homedir();
  return [path.join(home, '.fnm', 'node-versions')];
}

export function getNodeSystemPaths(): string[] {
  return ['/usr/local/bin/node', '/usr/bin/node', path.join(os.homedir(), '.local', 'bin', 'node')];
}

export function getScoopNodePath(): string {
  const home = os.homedir();
  return path.join(home, 'scoop', 'apps', 'nodejs', 'current', 'node.exe');
}

export function getChocolateyNodePath(): string {
  return path.join(process.env.ALLUSERSPROFILE || 'C:\\ProgramData', 'chocolatey', 'bin', 'node.exe');
}

export function getWslVersionPath(): string | null {
  const candidate = '/proc/version';
  return fsSync.existsSync(candidate) ? candidate : null;
}

export async function findFirstExistingPath(paths: string[]): Promise<string | null> {
  for (const p of paths) {
    try {
      await fs.access(p);
      return p;
    } catch {
      continue;
    }
  }
  return null;
}

export async function findClaudeCliPath(): Promise<string | null> {
  return findFirstExistingPath(getClaudeCliPaths());
}

export async function findCodexCliPath(): Promise<string | null> {
  return findFirstExistingPath(getCodexCliPaths());
}

// ---- Compatibility exports for legacy server imports ----
export const systemPaths = {
  github: getGitHubCliPaths,
  claude: getClaudeCliPaths,
  codex: getCodexCliPaths,
};

export async function systemPathAccess(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function systemPathReadFile(filePath: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
  return fs.readFile(filePath, { encoding }) as unknown as Promise<string>;
}

export function getExtendedPath(_options?: { includeNvm?: boolean; includeFnm?: boolean }): string {
  return process.env.PATH || '';
}

export function getCodexConfigDir(): string {
  return path.join(os.homedir(), '.codex');
}

export function getCodexAuthPath(): string {
  return path.join(getCodexConfigDir(), 'auth.json');
}

export function getClaudeAuthIndicators(): { hasCredentialsFile: boolean; hasApiKey: boolean } {
  const credentialsPath = path.join(getClaudeConfigDir(), '.credentials.json');
  return {
    hasCredentialsFile: fsSync.existsSync(credentialsPath),
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
  };
}

export function getCodexAuthIndicators(): { hasCredentialsFile: boolean; hasApiKey: boolean } {
  const authPath = getCodexAuthPath();
  return {
    hasCredentialsFile: fsSync.existsSync(authPath),
    hasApiKey: Boolean(process.env.OPENAI_API_KEY),
  };
}

export function getOpenCodeAuthIndicators(): { hasCredentialsFile: boolean; hasApiKey: boolean } {
  return {
    hasCredentialsFile: false,
    hasApiKey: false,
  };
}

export function getShellPaths(): string[] {
  if (process.platform === 'win32') {
    return ['C:/Program Files/Git/bin/bash.exe', 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'];
  }
  return ['/bin/bash', '/bin/zsh', '/bin/sh'];
}

export function findGitBashPath(): string | null {
  const candidates = ['C:/Program Files/Git/bin/bash.exe', 'C:/Program Files (x86)/Git/bin/bash.exe'];
  for (const p of candidates) {
    if (fsSync.existsSync(p)) return p;
  }
  return null;
}
