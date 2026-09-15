export enum EmbeddingProvider {
  OLLAMA = 'ollama',
}

export enum EmbeddingModel {
  NOMIC_EMBED_TEXT = 'nomic-embed-text',
}

export interface EmbeddingMethod {
  provider: EmbeddingProvider;
  model: EmbeddingModel;
}

export enum ExtractionType {
  NODE_LIBRARY = 'node_library',
}

export interface ExtractionMethod {
  type: ExtractionType;
  details: any;
}

export enum PostContentType {
  TEXT_PLAIN = 'text/plain',
}

export interface PostPayload {
  post_id: number;
  chunk_index: number;
  content_type: PostContentType;
  embedding_method: EmbeddingMethod;
  extraction_method?: ExtractionMethod;
  [key: string]: unknown;
}
