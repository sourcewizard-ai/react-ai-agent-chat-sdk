import { ChatStorage, ChatMessage, Conversation } from 'react-ai-agent-chat-sdk/config';

// In-memory storage for server-side use
export class MemoryStorage implements ChatStorage {
  private conversations: Record<string, Conversation>;
  
  constructor() {
    this.conversations = {};
  }
  
  async saveMessage(conversationId: string, message: ChatMessage): Promise<void> {
    // Get or create conversation
    let conversation = this.conversations[conversationId];
    if (!conversation) {
      conversation = {
        id: conversationId,
        messages: [],
        createdAt: new Date(message.timestamp),
        updatedAt: new Date(message.timestamp),
        metadata: {},
      };
    }
    
    // Add message and update timestamps
    conversation.messages.push(message);
    conversation.updatedAt = new Date();
    
    // Store updated conversation
    this.conversations[conversationId] = conversation;
    
    console.log(`💾 [MemoryStorage] Saved message to conversation ${conversationId}:`, message.role, message.content.slice(0, 50) + '...');
    console.log(`💾 [MemoryStorage] Conversation now has ${conversation.messages.length} messages`);
  }
  
  async getConversation(conversationId: string): Promise<Conversation | null> {
    const conversation = this.conversations[conversationId];
    console.log(`🔍 [MemoryStorage] Getting conversation ${conversationId}:`, conversation ? `${conversation.messages.length} messages` : 'not found');
    return conversation || null;
  }
  
  async listConversations(limit: number = 50, offset: number = 0): Promise<Conversation[]> {
    return Object.values(this.conversations)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()) // Most recent first
      .slice(offset, offset + limit);
  }
  
  async createConversation(conversationId: string, metadata: Record<string, unknown> = {}): Promise<Conversation> {
    const conversation: Conversation = {
      id: conversationId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    };
    
    this.conversations[conversationId] = conversation;
    console.log(`📝 [MemoryStorage] Created new conversation ${conversationId}`);
    
    return conversation;
  }
  
  async deleteConversation(conversationId: string): Promise<void> {
    delete this.conversations[conversationId];
    console.log(`🗑️ [MemoryStorage] Deleted conversation ${conversationId}`);
  }
}