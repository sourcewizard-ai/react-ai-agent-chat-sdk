// Main chat component with default layout
export { AgentChat } from './agent-chat';

// Individual components for custom layouts
export { ChatMessage } from './chat-message';
export { ChatInput } from './chat-input';
export { MessagePart } from './message-part';
export { FunctionCallBlock } from './function-call-block';
export { ThinkingBubble } from './thinking-bubble';
export { DebugPanel } from './debug-panel';

// Layout components
export { ChatLayout, ChatMessagesContainer } from './chat-layout';

// Context and configuration
export { AgentChatProvider, useChatConfig, useChatState } from './chat-config-provider';
export { createTool, makeAgentChatConfig } from './config';
export type { AgentChatConfig, AgentChatRouteConfig } from './config';

// Tool registry (for advanced usage)
export { registerToolRenderer, getToolRenderer, hasCustomRenderer } from './tool-renderer-registry';

// API route handlers
export { AgentChatRoute, chatRoute, chatHistoryRoute } from './api';