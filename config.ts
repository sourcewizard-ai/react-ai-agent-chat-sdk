// Re-export from client and server configurations with explicit naming to resolve conflicts
// Client-side exports (with React component support)
export type {
  AgentChatConfig,
} from './config-client';

export {
  makeAgentChatClientConfig,
} from './config-client';

// Server-side exports
export type {
  AgentChatRouteConfig,
  ChatStorage,
  ModelConfig,
} from './config-server';

export {
  makeAgentChatRouteConfig,
  wrapToolWithTimeoutRetry,
} from './config-server';

// Common exports (use server version as canonical)
export type {
  ToolCall,
  ToolResult,
  ChatMessage,
  Conversation,
  Tool,
  ToolsObject,
} from './config-server';

export {
  createTool,
} from './config-server';

// For backward compatibility, also provide the combined makeAgentChatConfig function
import { makeAgentChatClientConfig } from './config-client';
import { makeAgentChatRouteConfig, type ModelConfig, type ChatStorage, type ToolsObject } from './config-server';
import type { ToolExecutionConfig } from './tool-execution';

export function makeAgentChatConfig<TTools extends ToolsObject>({
  system_prompt,
  route,
  tools,
  auth_func,
  toolExecutionConfig,
  modelConfig,
  storage,
  historyRoute,
  showDebugPanel
}: {
  system_prompt: string;
  route: string;
  tools: TTools;
  auth_func: () => Promise<boolean>;
  toolExecutionConfig?: Partial<ToolExecutionConfig>;
  modelConfig?: ModelConfig<TTools>;
  storage?: ChatStorage;
  historyRoute?: string;
  showDebugPanel?: boolean;
}) {
  return {
    agentChatConfig: makeAgentChatClientConfig({ route, tools, toolExecutionConfig, historyRoute, showDebugPanel }),
    agentChatRouteConfig: makeAgentChatRouteConfig({ system_prompt, tools, auth_func, toolExecutionConfig, modelConfig, storage })
  };
}
