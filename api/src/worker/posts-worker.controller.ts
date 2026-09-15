import { Controller } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { type PostCreatedEvent, PostsService } from '../posts/posts.service';

@Controller()
export class PostsWorkerController {
  constructor(private readonly postService: PostsService) {}

  @EventPattern('post.created')
  async handlePostCreated(data: PostCreatedEvent): Promise<void> {
    const post = await this.postService.findOne(data.postId);
  }
}
