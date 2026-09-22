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
      await this.postService.markFailed(post.id);
    }
  }
}
