export class LocalStorage {
  constructor() {
    this.storageKey = 'agent-chat-conversations';
  }
  
  getStoredConversations() {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to parse stored conversations:', error);
      return {};
    }
  }
  
  setStoredConversations(conversations) {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(conversations, null, 2));
    } catch (error) {
      console.error('Failed to store conversations:', error);
    }
  }
  
  async getConversation(conversationId) {
    const conversations = this.getStoredConversations();
    const conversation = conversations[conversationId];
    
    if (!conversation) {
      return null;
    }
    
    // Convert string dates back to Date objects
    return {
      ...conversation,
      createdAt: typeof conversation.createdAt === 'string' ? new Date(conversation.createdAt) : conversation.createdAt,
      updatedAt: typeof conversation.updatedAt === 'string' ? new Date(conversation.updatedAt) : conversation.updatedAt,
      messages: conversation.messages.map(msg => ({
        ...msg,
        timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp,
      })),
    };
  }
  
  async listConversations(limit = 50, offset = 0) {
    const conversations = this.getStoredConversations();
    
    return Object.values(conversations)
      .sort((a, b) => {
        const dateA = typeof a.updatedAt === 'string' ? new Date(a.updatedAt) : a.updatedAt;
        const dateB = typeof b.updatedAt === 'string' ? new Date(b.updatedAt) : b.updatedAt;
        return dateB.getTime() - dateA.getTime(); // Most recent first
      })
      .slice(offset, offset + limit)
      .map(conversation => ({
        ...conversation,
        createdAt: typeof conversation.createdAt === 'string' ? new Date(conversation.createdAt) : conversation.createdAt,
        updatedAt: typeof conversation.updatedAt === 'string' ? new Date(conversation.updatedAt) : conversation.updatedAt,
        messages: conversation.messages.map(msg => ({
          ...msg,
          timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp,
        })),
      }));
  }
  
  deleteConversation(conversationId) {
    const conversations = this.getStoredConversations();
    delete conversations[conversationId];
    this.setStoredConversations(conversations);
    
    console.log(`🗑️ Deleted conversation ${conversationId}`);
  }
  
  // Additional utility methods
  getAllConversationIds() {
    return Object.keys(this.getStoredConversations());
  }
  
  getTotalMessageCount(conversationId) {
    const conversation = this.getStoredConversations()[conversationId];
    return conversation ? conversation.messages.length : 0;
  }
  
  clearAllConversations() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
      console.log('🧹 Cleared all conversations from localStorage');
    }
  }
}