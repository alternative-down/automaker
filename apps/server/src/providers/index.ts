/**
 * Provider exports
 */

// Base providers
export { BaseProvider } from './base-provider.js';
export {
  CliProvider,
  type SpawnStrategy,
  type CliSpawnConfig,
  type CliErrorInfo,
} from './cli-provider.js';
export type {
  ProviderConfig,
  ExecuteOptions,
  ProviderMessage,
  InstallationStatus,
  ModelDefinition,
  AgentDefinition,
  ReasoningEffort,
  SystemPromptPreset,
  ConversationMessage,
  ContentBlock,
  ValidationResult,
  McpServerConfig,
  McpStdioServerConfig,
  McpSSEServerConfig,
  McpHttpServerConfig,
} from './types.js';

// Claude provider
export { ClaudeProvider } from './claude-provider.js';

// Gemini provider
export { GeminiProvider, GeminiErrorCode } from './gemini-provider.js';

// Provider factory
export { ProviderFactory } from './provider-factory.js';

// Simple query service - unified interface for basic AI queries
export { simpleQuery, streamingQuery } from './simple-query-service.js';
export type {
  SimpleQueryOptions,
  SimpleQueryResult,
  StreamingQueryOptions,
} from './simple-query-service.js';
