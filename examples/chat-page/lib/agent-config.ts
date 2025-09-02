import { z } from 'zod';
import { makeAgentChatConfig, createTool } from 'react-ai-agent-chat-sdk/config';
import { ToolRenderer } from './agent-tools';
import { MemoryStorage } from './memory-storage';

// Mock file system - in memory storage
const mockFileSystem = new Map<string, string>();

// Initialize with some sample files
mockFileSystem.set('README.md', `# My Project

This is a sample project with some files.

## Features
- File reading
- File editing
- Chat interface`);

mockFileSystem.set('package.json', `{
  "name": "sample-project",
  "version": "1.0.0",
  "description": "A sample project",
  "main": "index.js"
}`);

mockFileSystem.set('src/index.js', `console.log('Hello, World!');

function greet(name) {
  return \`Hello, \${name}!\`;
}

module.exports = { greet };`);

// Define Zod schemas for tool inputs
const readFileSchema = z.object({
  file_path: z.string().describe('The path to the file to read'),
});

const editFileSchema = z.object({
  file_path: z.string().describe('The path to the file to edit'),
  content: z.string().describe('The new content for the file'),
});

const listFilesSchema = z.object({});

// Define tool execution functions separately
const executeReadFile = async ({ file_path }: z.infer<typeof readFileSchema>) => {
  console.log('🔧 TOOL EXECUTED: read_file with path:', file_path);
  const content = mockFileSystem.get(file_path);
  if (content === undefined) {
    const result = {
      error: `File not found: ${file_path}`,
      available_files: Array.from(mockFileSystem.keys()),
    };
    console.log('🔧 TOOL RESULT:', result);
    return result;
  }
  const result = {
    file_path,
    content,
  };
  console.log('🔧 TOOL RESULT:', result);
  //await new Promise(resolve => setTimeout(resolve, 10000));
  return result;
};

const executeEditFile = async ({ file_path, content }: z.infer<typeof editFileSchema>) => {
  console.log('🔧 TOOL EXECUTED: edit_file with path:', file_path, 'content length:', content.length);
  mockFileSystem.set(file_path, content);
  const result = {
    file_path,
    message: `Successfully updated ${file_path}`,
    content_length: content.length,
  };
  console.log('🔧 TOOL RESULT:', result);
  return result;
};

const executeListFiles = async ({ }: z.infer<typeof listFilesSchema>) => {
  console.log('🔧 TOOL EXECUTED: list_files - starting 10 second delay');

  try {
    const result = {
      files: Array.from(mockFileSystem.keys()),
      count: mockFileSystem.size,
    };
    //await new Promise(resolve => setTimeout(resolve, 10000));
    console.log('🔧 TOOL RESULT:', result);
    return result;
  } catch (error) {
    console.log('🔧 TOOL ERROR:', error);
    throw error;
  }
};

// Create tools using the helper function
export const tools = {
  read_file: createTool({
    description: 'Read the contents of a file',
    display_name: "Reading file",
    inputSchema: readFileSchema,
    execute: executeReadFile,
    executionConfig: {
      timeoutMs: 5000, // 15 seconds (shorter than default 30s)
      retries: 1, // Only 1 retry (instead of default 3)
      retryDelayMs: 2000, // 2 second delay (instead of default 1s)
    },
  }),
  edit_file: createTool({
    description: 'Edit a file by replacing its entire contents',
    display_name: "Editing file",
    inputSchema: editFileSchema,
    execute: executeEditFile,
  }),
  list_files: createTool({
    description: 'List all available files in the mock file system',
    display_name: "Listing files",
    inputSchema: listFilesSchema,
    execute: executeListFiles,
    render: ToolRenderer,
    executionConfig: {
      timeoutMs: 5000, // 15 seconds (shorter than default 30s)
      retries: 1, // Only 1 retry (instead of default 3)
      retryDelayMs: 2000, // 2 second delay (instead of default 1s)
    },
  }),
};

// Create storage instance - use in-memory storage for server side
const storage = new MemoryStorage();

const { agentChatConfig: baseAgentChatConfig, agentChatRouteConfig } = makeAgentChatConfig(
  `You are a helpful assistant with access to file management tools.
When displaying file contents, ALWAYS wrap them in triple backticks(\`\`\`) to show them
as code blocks, preserving the original formatting.
Do not render markdown files as HTML - show the raw markdown content in code blocks.
When a user asks about files, first list the files, then read the specific file they want,
and finally provide a complete response with the file contents in code blocks.
ALWAYS provide a text response after using tools - never stop with just tool calls.`,
  "/api/chat",
  tools,
  async (): Promise<boolean> => {
    return true;
  },
  undefined, // toolExecutionConfig
  undefined, // modelConfig
  storage     // storage
)

// Export config without tool renderers to avoid serialization issues
export const agentChatConfig = baseAgentChatConfig;

export { agentChatRouteConfig };
