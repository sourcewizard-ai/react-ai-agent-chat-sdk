import { ToolRenderer } from './agent-tools.jsx';

// Create client configuration directly
export const agentChatClientConfig = {
  tools: {
    read_file: { display_name: "Reading file" },
    edit_file: { display_name: "Editing file" },
    list_files: { display_name: "Listing files", renderKey: "list_files" },
  },
  route: "http://localhost:3001/api/chat",
  historyRoute: "http://localhost:3001/api/chat/history",
  toolRenderers: {
    'list_files': ToolRenderer,
  },
  showDebugPanel: import.meta.env.DEV,
};