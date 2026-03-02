import { spawn } from 'child_process';
import * as os from 'os';
import * as pty from 'node-pty';
import { ClaudeUsage } from '../routes/claude/types.js';
import { createLogger } from '@automaker/utils';

/**
 * Claude Usage Service
 */
const logger = createLogger('ClaudeUsage');

export class ClaudeUsageService {
  private claudeBinary = 'claude';
  private timeout = 30000;
  private isWindows = os.platform() === 'win32';

  private killPtyProcess(ptyProcess: pty.IPty, signal: string = 'SIGTERM'): void {
    if (this.isWindows) {
      ptyProcess.kill();
    } else {
      ptyProcess.kill(signal);
    }
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkCmd = this.isWindows ? 'where' : 'which';
      const proc = spawn(checkCmd, [this.claudeBinary]);
      proc.on('close', (code) => {
        resolve(code === 0);
      });
      proc.on('error', () => {
        resolve(false);
      });
    });
  }

  async fetchUsageData(): Promise<ClaudeUsage> {
    const output = await this.executeClaudeUsageCommandPty();
    return this.parseUsageOutput(output);
  }

  private executeClaudeUsageCommandPty(): Promise<string> {
    return new Promise((resolve, reject) => {
      let output = '';
      let settled = false;
      const workingDirectory = process.cwd();
      const shell = this.isWindows ? 'cmd.exe' : '/bin/sh';
      const args = this.isWindows
        ? ['/c', 'claude', '--add-dir', workingDirectory]
        : ['-c', `claude --add-dir "${workingDirectory}"`];

      const ptyOptions: pty.IPtyForkOptions = {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: workingDirectory,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
        } as Record<string, string>,
      };

      if (this.isWindows) {
        (ptyOptions as pty.IWindowsPtyForkOptions).useConpty = false;
      }

      let ptyProcess: any;
      try {
        ptyProcess = pty.spawn(shell, args, ptyOptions);
      } catch (spawnError) {
        reject(new Error(`PTY spawn failed: ${(spawnError as Error).message}`));
        return;
      }

      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          if (ptyProcess && !ptyProcess.killed) this.killPtyProcess(ptyProcess);
          resolve(output);
        }
      }, 45000);

      ptyProcess.onData((data: string) => {
        output += data;
        const cleanOutput = output.replace(/\x1B\[[0-9;?]*[A-Za-z@]/g, '');
        if (cleanOutput.includes('Current session') || /\d+%\s*(left|used)/i.test(cleanOutput)) {
          setTimeout(() => {
            if (!settled && ptyProcess && !ptyProcess.killed) {
              ptyProcess.write('\x1b');
              setTimeout(() => { if (!settled && ptyProcess && !ptyProcess.killed) this.killPtyProcess(ptyProcess); }, 2000);
            }
          }, 3000);
        }
      });

      ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
        clearTimeout(timeoutId);
        if (settled) return;
        settled = true;
        resolve(output);
      });
    });
  }

  private parseUsageOutput(rawOutput: string): ClaudeUsage {
    // Simplified parsing logic
    return {
      sessionTokensUsed: 0,
      sessionLimit: 0,
      sessionPercentage: 0,
      sessionResetTime: '',
      sessionResetText: '',
      weeklyTokensUsed: 0,
      weeklyLimit: 0,
      weeklyPercentage: 0,
      weeklyResetTime: '',
      weeklyResetText: '',
      sonnetWeeklyTokensUsed: 0,
      sonnetWeeklyPercentage: 0,
      sonnetResetText: '',
      costUsed: null,
      costLimit: null,
      costCurrency: null,
      lastUpdated: new Date().toISOString(),
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}
