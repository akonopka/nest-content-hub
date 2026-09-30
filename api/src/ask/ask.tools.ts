import type { Tool } from 'ollama';
import { PostStatus } from '../generated/prisma/enums';

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

export const queryContentTool: Tool = {
  type: 'function',
  function: {
    name: 'query_posts',
    description:
      'Query stored posts by status and/or creation date range to answer questions about metadata, such as how many posts have a given status or which posts were created in a given period. Not for finding content by meaning — use search_content for that.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(PostStatus),
          description:
            'Filter posts by status. Omit to include posts with any status.',
        },
        date_from: {
          type: 'string',
          description:
            'Only include posts created on or after this date (ISO 8601, e.g. "2026-09-01"). Omit for no lower bound.',
        },
        date_to: {
          type: 'string',
          description:
            'Only include posts created on or before this date (ISO 8601, e.g. "2026-09-30"). Omit for no upper bound.',
        },
      },
    },
  },
};
