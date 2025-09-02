'use client';

import { LocalStorage } from './local-storage';

const storage = new LocalStorage();

export function ChatDebugPanel({ conversationId }: { conversationId: string }) {

  const handleClearConversation = () => {
    if (conversationId) {
      storage.deleteConversation(conversationId);
      console.log(`Cleared conversation: ${conversationId}`);
    }
  };

  const handleClearAllConversations = () => {
    storage.clearAllConversations();
    console.log('Cleared all conversations');
  };

  const handleShowStoredData = async () => {
    console.log('=== STORED CONVERSATION DATA ===');
    console.log('Conversation ID:', conversationId);
    
    if (conversationId) {
      const conversation = await storage.getConversation(conversationId);
      console.log('Conversation:', conversation);
      
      console.log('Total messages in current conversation:', storage.getTotalMessageCount(conversationId));
    }
    
    const allConversations = await storage.listConversations();
    console.log('All conversations:', allConversations.length);
    console.log('All conversation IDs:', storage.getAllConversationIds());
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50">
      <div className="text-sm text-gray-600 mb-2">
        <strong>Debug Panel</strong>
      </div>
      <div className="text-xs text-gray-500 mb-3">
        Conversation ID: <code className="bg-white px-1 rounded">{conversationId || 'Loading...'}</code>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={handleShowStoredData}
          disabled={!conversationId}
          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Show Storage Data
        </button>
        <button
          onClick={handleClearConversation}
          disabled={!conversationId}
          className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear This Conversation
        </button>
        <button
          onClick={handleClearAllConversations}
          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Clear All Storage
        </button>
      </div>
    </div>
  );
}