import type { Tool } from 'ollama';
import { OrderPostsBy } from '../posts/posts.service';
import { PostStatus } from '../generated/prisma/enums';

export const searchContentTool: Tool = {
  type: 'function',
  function: {
    name: 'searchContent',
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
    name: 'queryPosts',
    description:
      'Query stored posts by status and/or creation date range to answer questions about metadata, such as how many posts have a given status, which posts were created in a given period, or which post is the newest/oldest (use orderBy with limit: 1 only for that specific question, never for counting). Not for finding content by meaning — use searchContent for that.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: Object.values(PostStatus),
          description:
            'Filter posts by status. Omit to include posts with any status.',
        },
        dateFrom: {
          type: 'string',
          description:
            'Only include posts created on or after this date (ISO 8601, e.g. "2026-09-01"). Omit for no lower bound.',
        },
        dateTo: {
          type: 'string',
          description:
            'Only include posts created on or before this date (ISO 8601, e.g. "2026-09-30"). Omit for no upper bound.',
        },
        orderBy: {
          type: 'string',
          enum: Object.values(OrderPostsBy),
          description:
            'Sort the results by creation date, ascending or descending. When asked for the single newest or oldest post, always set this together with limit: 1 — never use orderBy alone for that question, or you will get the whole sorted list instead of one post. Omit for no particular order.',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of posts to return. Set this to 1 together with orderBy ONLY when asked for the single newest or oldest post. Do NOT set it when counting posts or answering "how many" — that needs the full matching list, not just one. Omit for no limit.',
        },
      },
    },
  },
};
