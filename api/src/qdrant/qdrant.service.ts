import { Injectable } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';

@Injectable()
export class QdrantService {
  private client = new QdrantClient({ url: process.env.QDRANT_URL! });

  async getCollection(name: string) {
    return this.client.getCollection(name);
  }

  async createCollection(
    name: string,
    params: Parameters<QdrantClient['createCollection']>[1],
  ) {
    return this.client.createCollection(name, params);
  }

  async upsert(name: string, params: Parameters<QdrantClient['upsert']>[1]) {
    return this.client.upsert(name, params);
  }

  async search(
    name: string,
    vector: number[],
    limit: number,
    scoreThreshold: number,
  ) {
    return this.client.query(name, {
      query: vector,
      limit,
      score_threshold: scoreThreshold,
      with_payload: true,
    });
  }
}
