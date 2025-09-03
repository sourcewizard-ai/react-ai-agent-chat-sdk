'use client';

import { AgentChatConfig } from './config';
import { AgentChatProvider, useChatState } from './chat-config-provider';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { DebugPanel } from './debug-panel';
import { ChatLayout, ChatMessagesContainer } from './chat-layout';

export const AgentChat = ({ config, conversationId }: { config: AgentChatConfig; conversationId: string }) => {
  return (
    <AgentChatProvider config={config} conversationId={conversationId}>
      <ChatLayout>
        <ChatMessagesContainer>
          <ChatMessages />
          {config.showDebugPanel && <DebugPanel />}
        </ChatMessagesContainer>
        <ChatInput />
      </ChatLayout>
    </AgentChatProvider>
  );
};

const ChatMessages = () => {
  const { chatHelpers, isLoadingHistory, conversationId, config } = useChatState();
  
  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          <span className="text-sm">Loading conversation history...</span>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {chatHelpers.messages.map((message: any, messageIndex: number) => (
        <ChatMessage 
          key={messageIndex} 
          message={message} 
          messageIndex={messageIndex}
          isLastMessage={messageIndex === chatHelpers.messages.length - 1}
        />
      ))}
    </>
  );
};
