import { Test, TestingModule } from '@nestjs/testing';
import { PostsWorkerController } from './posts-worker.controller';
import { PostsService } from '../posts/posts.service';
import { OllamaService } from '../ollama/ollama.service';
import { QdrantService } from '../qdrant/qdrant.service';

describe('PostsWorkerController', () => {
  let postsWorkerController: PostsWorkerController;

  let ollamaService: { embed: jest.Mock };
  let postsService: {
    findOne: jest.Mock;
    markFailed: jest.Mock;
    markReady: jest.Mock;
  };
  let qdrantService: { upsert: jest.Mock };

  beforeEach(async () => {
    ollamaService = { embed: jest.fn() };
    postsService = {
      findOne: jest.fn(),
      markFailed: jest.fn(),
      markReady: jest.fn(),
    };
    qdrantService = { upsert: jest.fn() };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: OllamaService, useValue: ollamaService },
        { provide: PostsService, useValue: postsService },
        { provide: QdrantService, useValue: qdrantService },
      ],
      controllers: [PostsWorkerController],
    }).compile();

    postsWorkerController = testingModule.get<PostsWorkerController>(
      PostsWorkerController,
    );
  });

  it('logs an error and returns when the post is not found', async () => {
    const postId = 1;

    postsService.findOne.mockResolvedValue(null);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await expect(
      postsWorkerController.handlePostCreated({ postId }),
    ).resolves.toBeUndefined();

    expect(postsService.findOne).toHaveBeenCalledWith(postId);
    expect(consoleSpy).toHaveBeenCalledWith(
      `Failed to process post ${postId}`,
      expect.any(Error),
    );
    expect(ollamaService.embed).not.toHaveBeenCalled();
  });

  it('marks the post as failed when it has no content', async () => {
    const postId = 1;

    postsService.findOne.mockResolvedValue({ id: postId });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await expect(
      postsWorkerController.handlePostCreated({ postId }),
    ).resolves.toBeUndefined();

    expect(postsService.findOne).toHaveBeenCalledWith(postId);
    expect(consoleSpy).toHaveBeenCalledWith(
      `Failed to process post ${postId}`,
      expect.any(Error),
    );
    expect(postsService.markFailed).toHaveBeenCalledWith(postId);
    expect(ollamaService.embed).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'embeds the content, upserts to Qdrant and marks the post as ready',
      embeddModel: 'nomic-embed-text',
      embeddModelSupported: true,
      embeddThrows: false,
      upsertThrows: false,
    },
    {
      name: 'logs an error and leaves the post untouched when the configured embedding model is unsupported',
      embeddModel: 'some unsupported model',
      embeddModelSupported: false,
      embeddThrows: false,
      upsertThrows: false,
    },
    {
      name: 'marks the post as failed when embedding throws',
      embeddModel: 'nomic-embed-text',
      embeddModelSupported: true,
      embeddThrows: true,
      upsertThrows: false,
    },
    {
      name: 'marks the post as failed when upsert throws',
      embeddModel: 'nomic-embed-text',
      embeddModelSupported: true,
      embeddThrows: false,
      upsertThrows: true,
    },
  ])(
    '$name',
    async ({
      embeddModel,
      embeddModelSupported,
      embeddThrows,
      upsertThrows,
    }) => {
      process.env.OLLAMA_EMBEDD_MODEL = embeddModel;

      const postId = 1;
      const existingPost = { id: postId, content: 'some content' };
      const vector = [0.1, 0.2, 0.3];

      postsService.findOne.mockResolvedValue(existingPost);

      if (!embeddThrows) {
        ollamaService.embed.mockResolvedValue(vector);
      } else {
        ollamaService.embed.mockRejectedValue(new Error('embed failed'));
      }
      if (upsertThrows) {
        qdrantService.upsert.mockRejectedValue(new Error('upsert failed'));
      }

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        postsWorkerController.handlePostCreated({ postId }),
      ).resolves.toBeUndefined();

      expect(postsService.findOne).toHaveBeenCalledWith(postId);

      if (embeddModelSupported) {
        if (!embeddThrows) {
          expect(ollamaService.embed).toHaveBeenCalledWith(
            existingPost.content,
          );

          if (!upsertThrows) {
            expect(qdrantService.upsert).toHaveBeenCalledWith(
              process.env.POSTS_COLLECTION,
              {
                points: [
                  {
                    id: postId,
                    vector,
                    payload: {
                      post_id: postId,
                      chunk_index: 0,
                      content_type: 'text/plain',
                      embedding_method: {
                        provider: 'ollama',
                        model: embeddModel,
                      },
                    },
                  },
                ],
              },
            );
            expect(postsService.markReady).toHaveBeenCalledWith(postId);
          }
        } else {
          expect(qdrantService.upsert).not.toHaveBeenCalled();
        }

        if (embeddThrows || upsertThrows) {
          expect(consoleSpy).toHaveBeenCalledWith(
            `Failed to process post ${postId}`,
            expect.any(Error),
          );
          expect(postsService.markFailed).toHaveBeenCalledWith(postId);
          expect(postsService.markReady).not.toHaveBeenCalled();
        }
      } else {
        expect(consoleSpy).toHaveBeenCalledWith(
          `Unsupported embedding model: ${embeddModel}`,
        );

        expect(ollamaService.embed).not.toHaveBeenCalled();
        expect(qdrantService.upsert).not.toHaveBeenCalled();
      }
    },
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});
