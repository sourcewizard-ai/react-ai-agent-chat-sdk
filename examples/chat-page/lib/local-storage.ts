import { ChatStorage, ChatMessage, Conversation } from 'react-ai-agent-chat-sdk/config';

export class LocalStorage implements ChatStorage {
  private readonly storageKey = 'agent-chat-conversations';
  
  private getStoredConversations(): Record<string, Conversation> {
    if (typeof window === 'undefined') return {};
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to parse stored conversations:', error);
      return {};
    }
  }
  
  private setStoredConversations(conversations: Record<string, Conversation>): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(conversations, null, 2));
    } catch (error) {
      console.error('Failed to store conversations:', error);
    }
  }
  
  async saveMessage(conversationId: string, message: ChatMessage): Promise<void> {
    const conversations = this.getStoredConversations();
    
    // Get or create conversation
    let conversation = conversations[conversationId];
    if (!conversation) {
      conversation = {
        id: conversationId,
        messages: [],
        createdAt: new Date(message.timestamp),
        updatedAt: new Date(message.timestamp),
        metadata: {},
      };
    }
    
    // Convert dates from strings if needed (JSON parsing converts dates to strings)
    if (typeof conversation.createdAt === 'string') {
      conversation.createdAt = new Date(conversation.createdAt);
    }
    if (typeof conversation.updatedAt === 'string') {
      conversation.updatedAt = new Date(conversation.updatedAt);
    }
    
    // Add message and update timestamps
    conversation.messages.push({
      ...message,
      timestamp: typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp,
    });
    conversation.updatedAt = new Date();
    
    // Store updated conversations
    conversations[conversationId] = conversation;
    this.setStoredConversations(conversations);
    
    console.log(`💾 Saved message to conversation ${conversationId}:`, message.role, message.content.slice(0, 50) + '...');
  }
  
  async getConversation(conversationId: string): Promise<Conversation | null> {
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
  
  async listConversations(limit: number = 50, offset: number = 0): Promise<Conversation[]> {
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
  
  async createConversation(conversationId: string, metadata: Record<string, unknown> = {}): Promise<Conversation> {
    const conversations = this.getStoredConversations();
    
    const conversation: Conversation = {
      id: conversationId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    };
    
    conversations[conversationId] = conversation;
    this.setStoredConversations(conversations);
    
    return conversation;
  }
  
  async deleteConversation(conversationId: string): Promise<void> {
    const conversations = this.getStoredConversations();
    delete conversations[conversationId];
    this.setStoredConversations(conversations);
    
    console.log(`🗑️ Deleted conversation ${conversationId}`);
  }
  
  // Additional utility methods
  getAllConversationIds(): string[] {
    return Object.keys(this.getStoredConversations());
  }
  
  getTotalMessageCount(conversationId: string): number {
    const conversation = this.getStoredConversations()[conversationId];
    return conversation ? conversation.messages.length : 0;
  }
  
  clearAllConversations(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.storageKey);
      console.log('🧹 Cleared all conversations from localStorage');
    }
  }
}