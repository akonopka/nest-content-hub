import type { Tool } from 'ollama';

export const searchContentTool: Tool = {
  type: 'function',
  function: {
    name: 'search_content',
    description:
      "Search the user's stored posts by meaning to find content relevant to their question",
    parameters: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The user question to search for.',
        },
      },
      required: ['question'],
    },
  },
};
