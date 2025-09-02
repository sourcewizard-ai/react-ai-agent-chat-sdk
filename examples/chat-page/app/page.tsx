'use client';

import { useEffect, useState } from 'react';
import { AgentChat } from 'react-ai-agent-chat-sdk';
import 'react-ai-agent-chat-sdk/agent-chat.css';
import { agentChatConfig } from '@/lib/agent-config';
import { createClientConfig } from '@/lib/agent-chat-client-config';
import { ChatDebugPanel } from '@/lib/chat-debug-panel';

export default function Home() {
  const [conversationId, setConversationId] = useState<string>('');
  const clientConfig = createClientConfig(agentChatConfig);
  
  useEffect(() => {
    // Load or create conversation ID on client side
    let id = localStorage.getItem('current-conversation-id');
    if (!id) {
      id = `conv_${crypto.randomUUID()}`;
      localStorage.setItem('current-conversation-id', id);
    }
    console.log('🆔 [App] Loaded conversation ID:', id);
    setConversationId(id);
  }, []);
  
  // Don't render chat until conversation ID is loaded
  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
          <span className="text-sm">Initializing...</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1">
        <AgentChat config={clientConfig} conversationId={conversationId} />
      </div>
      <ChatDebugPanel conversationId={conversationId} />
    </div>
  );
}
