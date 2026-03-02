/**
 * Settings Service - Handles reading/writing settings to JSON files
 */

import { createLogger, atomicWriteJson, DEFAULT_BACKUP_COUNT } from '@automaker/utils';
import * as secureFs from '../lib/secure-fs.js';
import path from 'path';

import {
  getGlobalSettingsPath,
  getCredentialsPath,
  getProjectSettingsPath,
  ensureDataDir,
  ensureAutomakerDir,
} from '@automaker/platform';
import type {
  GlobalSettings,
  Credentials,
  ProjectSettings,
  KeyboardShortcuts,
  PhaseModelConfig,
  PhaseModelEntry,
  FeatureTemplate,
  ClaudeCompatibleProvider,
  ProviderModel,
} from '../types/settings.js';
import {
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_CREDENTIALS,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_PHASE_MODELS,
  DEFAULT_FEATURE_TEMPLATES,
  SETTINGS_VERSION,
  CREDENTIALS_VERSION,
  PROJECT_SETTINGS_VERSION,
} from '../types/settings.js';
import {
  migrateModelId,
} from '@automaker/types';

const logger = createLogger('SettingsService');

async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const content = (await secureFs.readFile(filePath, 'utf-8')) as string;
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return defaultValue;
    }
    logger.error(`Error reading ${filePath}:`, error);
    return defaultValue;
  }
}

async function writeSettingsJson(filePath: string, data: unknown): Promise<void> {
  await atomicWriteJson(filePath, data, { backupCount: DEFAULT_BACKUP_COUNT });
}

export class SettingsService {
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
  }

  async getGlobalSettings(): Promise<GlobalSettings> {
    const settingsPath = getGlobalSettingsPath(this.dataDir);
    const settings = await readJsonFile<GlobalSettings>(settingsPath, DEFAULT_GLOBAL_SETTINGS);

    const migratedPhaseModels = this.migratePhaseModels(settings);
    const mergedFeatureTemplates = this.mergeBuiltInTemplates(settings.featureTemplates);

    let result: GlobalSettings = {
      ...DEFAULT_GLOBAL_SETTINGS,
      ...settings,
      keyboardShortcuts: {
        ...DEFAULT_GLOBAL_SETTINGS.keyboardShortcuts,
        ...settings.keyboardShortcuts,
      },
      phaseModels: migratedPhaseModels,
      featureTemplates: mergedFeatureTemplates,
    };

    result.version = SETTINGS_VERSION;
    return result;
  }

  private mergeBuiltInTemplates(storedTemplates: FeatureTemplate[] | undefined): FeatureTemplate[] {
    if (!storedTemplates) {
      return DEFAULT_FEATURE_TEMPLATES;
    }
    const storedIds = new Set(storedTemplates.map((t) => t.id));
    const missingBuiltIns = DEFAULT_FEATURE_TEMPLATES.filter((t) => !storedIds.has(t.id));
    return [...storedTemplates, ...missingBuiltIns];
  }

  private migratePhaseModels(settings: Partial<GlobalSettings>): PhaseModelConfig {
    const result: PhaseModelConfig = { ...DEFAULT_PHASE_MODELS };
    if (settings.phaseModels) {
      const merged: PhaseModelConfig = { ...DEFAULT_PHASE_MODELS };
      for (const key of Object.keys(settings.phaseModels) as Array<keyof PhaseModelConfig>) {
        const value = settings.phaseModels[key];
        if (value !== undefined) {
          merged[key] = this.toPhaseModelEntry(value);
        }
      }
      return merged;
    }
    return result;
  }

  private toPhaseModelEntry(value: string | PhaseModelEntry): PhaseModelEntry {
    if (typeof value === 'string') {
      return { model: migrateModelId(value) as PhaseModelEntry['model'] };
    }
    return {
      ...value,
      model: migrateModelId(value.model) as PhaseModelEntry['model'],
    };
  }

  async updateGlobalSettings(updates: Partial<GlobalSettings>): Promise<GlobalSettings> {
    await ensureDataDir(this.dataDir);
    const settingsPath = getGlobalSettingsPath(this.dataDir);
    const current = await this.getGlobalSettings();

    const updated: GlobalSettings = {
      ...current,
      ...updates,
      version: SETTINGS_VERSION,
    };

    await writeSettingsJson(settingsPath, updated);
    return updated;
  }

  async getCredentials(): Promise<Credentials> {
    const credentialsPath = getCredentialsPath(this.dataDir);
    const credentials = await readJsonFile<Credentials>(credentialsPath, DEFAULT_CREDENTIALS);
    return {
      ...DEFAULT_CREDENTIALS,
      ...credentials,
      apiKeys: {
        ...DEFAULT_CREDENTIALS.apiKeys,
        ...credentials.apiKeys,
      },
    };
  }

  async updateCredentials(updates: Partial<Credentials>): Promise<Credentials> {
    await ensureDataDir(this.dataDir);
    const credentialsPath = getCredentialsPath(this.dataDir);
    const current = await this.getCredentials();
    const updated: Credentials = {
      ...current,
      ...updates,
      version: CREDENTIALS_VERSION,
    };
    if (updates.apiKeys) {
      updated.apiKeys = {
        ...current.apiKeys,
        ...updates.apiKeys,
      };
    }
    await writeSettingsJson(credentialsPath, updated);
    return updated;
  }

  async getProjectSettings(projectPath: string): Promise<ProjectSettings> {
    const settingsPath = getProjectSettingsPath(projectPath);
    const settings = await readJsonFile<ProjectSettings>(settingsPath, DEFAULT_PROJECT_SETTINGS);
    return { ...DEFAULT_PROJECT_SETTINGS, ...settings };
  }

  async updateProjectSettings(projectPath: string, updates: Partial<ProjectSettings>): Promise<ProjectSettings> {
    await ensureAutomakerDir(projectPath);
    const settingsPath = getProjectSettingsPath(projectPath);
    const current = await this.getProjectSettings(projectPath);
    const updated: ProjectSettings = {
      ...current,
      ...updates,
      version: PROJECT_SETTINGS_VERSION,
    };
    await writeSettingsJson(settingsPath, updated);
    return updated;
  }

  getDataDir(): string {
    return this.dataDir;
  }
}
