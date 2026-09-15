import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { type PostCreatedEvent, PostsService } from '../posts/posts.service';
import { Ollama } from 'ollama';
import { QdrantClient } from '@qdrant/js-client-rest';
import {
  EmbeddingModel,
  EmbeddingProvider,
  PostContentType,
  PostPayload,
} from './post-payload.interface';

@Controller()
export class PostsWorkerController {
  constructor(private readonly postService: PostsService) {}

  @EventPattern('post.created')
  async handlePostCreated(data: PostCreatedEvent): Promise<void> {
    const postId = data.postId;
    const post = await this.postService.findOne(postId);

    if (!post) {
      console.error(`Post ${postId} not found`);
      return;
    }

    if (!post.content) {
      await this.postService.markFailed(postId);
      return;
    }

    try {
      if (
        !process.env.OLLAMA_EMBEDD_MODEL ||
        !Object.values(EmbeddingModel).includes(
          process.env.OLLAMA_EMBEDD_MODEL as EmbeddingModel,
        )
      ) {
        throw new Error(
          `Unsupported embedding model: ${process.env.OLLAMA_EMBEDD_MODEL}`,
        );
      }

      const ollama = new Ollama({ host: process.env.OLLAMA_URL });
      const client = new QdrantClient({ url: process.env.QDRANT_URL! });

      const response = await ollama.embed({
        model: process.env.OLLAMA_EMBEDD_MODEL!,
        input: post.content,
      });

      const vector = response.embeddings[0];

      const payload: PostPayload = {
        post_id: postId,
        chunk_index: 0,
        content_type: PostContentType.TEXT_PLAIN,
        embedding_method: {
          provider: EmbeddingProvider.OLLAMA,
          model: process.env.OLLAMA_EMBEDD_MODEL as EmbeddingModel,
        },
      };

      await client.upsert(process.env.POSTS_COLLECTION!, {
        points: [
          {
            id: postId,
            vector,
            payload,
          },
        ],
      });

      await this.postService.markReady(postId);
    } catch (error) {
      console.error(`Failed to process post ${data.postId}`, error);
      await this.postService.markFailed(post.id);
    }
  }
}
