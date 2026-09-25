import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { type PostCreatedEvent, PostsService } from '../posts/posts.service';
import {
  EmbeddingModel,
  EmbeddingProvider,
  PostContentType,
  PostPayload,
} from './post-payload.interface';
import { OllamaService } from '../ollama/ollama.service';
import { QdrantService } from '../qdrant/qdrant.service';
import { Post } from '../generated/prisma/client';

@Controller()
export class PostsWorkerController {
  constructor(
    private readonly postService: PostsService,
    private readonly ollamaService: OllamaService,
    private readonly qdrantService: QdrantService,
  ) {}

  @EventPattern('post.created')
  async handlePostCreated(data: PostCreatedEvent): Promise<void> {
    const postId = data.postId;
    let post: Post | null = null;

    try {
      post = await this.postService.findOne(postId);

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      if (!post.content) {
        throw new Error(`Post ${postId} has no content`);
      }

      if (
        !process.env.OLLAMA_EMBEDD_MODEL ||
        !Object.values(EmbeddingModel).includes(
          process.env.OLLAMA_EMBEDD_MODEL as EmbeddingModel,
        )
      ) {
        console.error(
          `Unsupported embedding model: ${process.env.OLLAMA_EMBEDD_MODEL}`,
        );
        return;
      }

      const vector = await this.ollamaService.embed(post.content);

      const payload: PostPayload = {
        post_id: postId,
        chunk_index: 0,
        content_type: PostContentType.TEXT_PLAIN,
        embedding_method: {
          provider: EmbeddingProvider.OLLAMA,
          model: process.env.OLLAMA_EMBEDD_MODEL as EmbeddingModel,
        },
      };

      await this.qdrantService.upsert(process.env.POSTS_COLLECTION!, {
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
      if (post) {
        await this.postService.markFailed(post.id);
      }
    }
  }
}
