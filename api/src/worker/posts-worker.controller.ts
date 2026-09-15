import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { type PostCreatedEvent, PostsService } from '../posts/posts.service';
import { Ollama } from 'ollama';

@Controller()
export class PostsWorkerController {
  constructor(private readonly postService: PostsService) {}

  @EventPattern('post.created')
  async handlePostCreated(data: PostCreatedEvent): Promise<void> {
    const post = await this.postService.findOne(data.postId);

    if (!post) {
      console.error(`Post ${data.postId} not found`);
      return;
    }

    if (!post.content) {
      await this.postService.markFailed(post.id);
      return;
    }

    try {
      const ollama = new Ollama({ host: process.env.OLLAMA_URL });
      const response = await ollama.embed({
        model: process.env.OLLAMA_EMBEDD_MODEL!,
        input: post.content,
      });
      await this.postService.markReady(post.id);
    } catch (error) {
      console.error(`Failed to process post ${data.postId}`);
      await this.postService.markFailed(post.id);
    }
  }
}
