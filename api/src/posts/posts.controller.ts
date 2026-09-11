import { Controller, Get } from '@nestjs/common';

@Controller('posts')
export class PostsController {
  @Get()
  getListRoute() {
    return 'Hello, NestJs!';
  }
}
