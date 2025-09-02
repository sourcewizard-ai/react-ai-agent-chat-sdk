'use client';

import { AgentChatConfig } from 'react-ai-agent-chat-sdk/config';
import { ToolRenderer } from './agent-tools';

// Client-side function to assemble config with tool renderers
export function createClientConfig(baseConfig: AgentChatConfig): AgentChatConfig {
  return {
    ...baseConfig,
    toolRenderers: {
      'list_files': ToolRenderer,
    }
  };
}