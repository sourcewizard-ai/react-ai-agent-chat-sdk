'use client';

import { ReactNode } from 'react';

interface ChatLayoutProps {
  children: ReactNode;
  className?: string;
}

export const ChatLayout = ({ children, className = '' }: ChatLayoutProps) => {
  return (
    <div className={`agent-chat ${className}`}>
      {children}
    </div>
  );
};

interface ChatMessagesContainerProps {
  children: ReactNode;
  className?: string;
}

export const ChatMessagesContainer = ({ children, className = '' }: ChatMessagesContainerProps) => {
  return (
    <div className={`agent-chat-messages ${className}`}>
      <div className="agent-chat-messages-container">
        {children}
      </div>
    </div>
  );
};