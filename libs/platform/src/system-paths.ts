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
  return [
    path.join(homeDir, '.local', 'bin', 'codex'),
    '/usr/local/bin/codex',
  ];
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
