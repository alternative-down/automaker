/**
 * @automaker/platform
 * Platform-specific utilities for AutoMaker (Forked for Web-only)
 */

// Path utilities
export {
  getAutomakerDir,
  getFeaturesDir,
  getFeatureDir,
  getFeatureImagesDir,
  getBoardDir,
  getImagesDir,
  getContextDir,
  getWorktreesDir,
  getValidationsDir,
  getValidationDir,
  getValidationPath,
  getAppSpecPath,
  getBranchTrackingPath,
  getExecutionStatePath,
  getNotificationsPath,
  getEventHistoryDir,
  getEventHistoryIndexPath,
  getEventPath,
  ensureEventHistoryDir,
  ensureAutomakerDir,
  getGlobalSettingsPath,
  getCredentialsPath,
  getProjectSettingsPath,
  ensureDataDir,
  getIdeationDir,
  getIdeasDir,
  getIdeaDir,
  getIdeaPath,
  getIdeaAttachmentsDir,
  getIdeationSessionsDir,
  getIdeationSessionPath,
  getIdeationDraftsDir,
  getIdeationAnalysisPath,
  ensureIdeationDir,
} from './paths.js';

// Subprocess management
export {
  spawnJSONLProcess,
  spawnProcess,
  type SubprocessOptions,
  type SubprocessResult,
} from './subprocess.js';

// Security
export {
  PathNotAllowedError,
  initAllowedPaths,
  isPathAllowed,
  validatePath,
  isPathWithinDirectory,
  getAllowedRootDirectory,
  getDataDirectory,
  getAllowedPaths,
} from './security.js';

// Secure file system
export * as secureFs from './secure-fs.js';

// Node.js finder
export {
  findNodeExecutable,
  buildEnhancedPath,
  type NodeFinderResult,
  type NodeFinderOptions,
} from './node-finder.js';

// WSL utilities
export {
  isWslAvailable,
  clearWslCache,
  getDefaultWslDistribution,
  getWslDistributions,
  findCliInWsl,
  execInWsl,
  createWslCommand,
  windowsToWslPath,
  wslToWindowsPath,
  type WslCliResult,
  type WslOptions,
} from './wsl.js';

// System paths
export {
  getGitHubCliPaths,
  getClaudeCliPaths,
  getClaudeConfigDir,
  getClaudeSettingsPath,
  getCodexCliPaths,
  systemPathExists,
  findFirstExistingPath,
  findClaudeCliPath,
  findCodexCliPath,
} from './system-paths.js';

// Port configuration
export { STATIC_PORT, SERVER_PORT, RESERVED_PORTS } from './config/ports.js';

// Editor detection
export {
  commandExists,
  clearEditorCache,
  detectAllEditors,
  detectDefaultEditor,
  findEditorByCommand,
  openInEditor,
  openInFileManager,
  openInTerminal,
} from './editor.js';

// External terminal detection
export {
  clearTerminalCache,
  detectAllTerminals,
  detectDefaultTerminal,
  findTerminalById,
  openInExternalTerminal,
} from './terminal.js';

// RC Generator
export {
  hexToXterm256,
  getThemeANSIColors,
  generateBashrc,
  generateZshrc,
  generateCommonFunctions,
  generateThemeColors,
  getShellName,
  type TerminalConfig,
  type TerminalTheme,
  type ANSIColors,
} from './rc-generator.js';

// RC File Manager
export {
  RC_FILE_VERSION,
  getTerminalDir,
  getThemesDir,
  getRcFilePath,
  ensureTerminalDir,
  checkRcFileVersion,
  needsRegeneration,
  writeAllThemeFiles,
  writeThemeFile,
  writeRcFiles,
  ensureRcFilesUpToDate,
  deleteTerminalDir,
  ensureUserCustomFile,
} from './rc-file-manager.js';

// Terminal Theme Colors
export { terminalThemeColors, getTerminalThemeColors } from './terminal-theme-colors.js';
