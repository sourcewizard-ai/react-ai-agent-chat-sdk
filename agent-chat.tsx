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
  const { chatHelpers, isLoadingHistory, conversationId, config, restoredMessages } = useChatState();
  
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
  
  // Combine restored messages with current chat messages
  // Filter out restored messages from current chat messages to avoid duplicates
  const currentMessages = chatHelpers.messages.filter((msg: any) => 
    !restoredMessages.some(restored => restored.id === msg.id)
  );
  
  const allMessages = [...restoredMessages, ...currentMessages];
  
  return (
    <>
      {allMessages.map((message: any, messageIndex: number) => (
        <ChatMessage 
          key={message.id || messageIndex} 
          message={message} 
          messageIndex={messageIndex}
          isLastMessage={messageIndex === allMessages.length - 1}
        />
      ))}
    </>
  );
};
