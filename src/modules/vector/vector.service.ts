import { Injectable, Logger } from '@nestjs/common';
import { CohereEmbeddings } from '@langchain/cohere';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VectorService {
  private readonly logger = new Logger(VectorService.name);
  private cohereEmbeddings: CohereEmbeddings;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('COHERE_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'Cohere API key not found. Vector search will be disabled.',
      );
      return;
    }

    this.cohereEmbeddings = new CohereEmbeddings({
      apiKey: apiKey,
      model: 'embed-english-v3.0',
    });
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      if (!this.cohereEmbeddings) {
        this.logger.warn('Cohere not initialized. Cannot generate embedding.');
        return null;
      }

      const cleanText = this.cleanText(text);
      if (!cleanText || cleanText.length < 3) {
        this.logger.warn('Text too short for embedding generation');
        return null;
      }

      const embedding = await this.cohereEmbeddings.embedQuery(cleanText);

      if (embedding && embedding.length > 0) {
        this.logger.log(
          `Generated embedding with ${embedding.length} dimensions`,
        );
        return embedding;
      }

      return null;
    } catch (error) {
      this.logger.error('Error generating embedding:', error.message);
      return null;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    try {
      if (!this.cohereEmbeddings) {
        this.logger.warn('Cohere not initialized. Cannot generate embeddings.');
        return texts.map(() => null);
      }

      const cleanTexts = texts
        .map((text) => this.cleanText(text))
        .filter((text) => text && text.length >= 3);

      if (cleanTexts.length === 0) {
        return texts.map(() => null);
      }

      const embeddings = await this.cohereEmbeddings.embedDocuments(cleanTexts);

      const result: (number[] | null)[] = [];
      let cleanTextIndex = 0;

      for (let i = 0; i < texts.length; i++) {
        const cleanText = this.cleanText(texts[i]);
        if (!cleanText || cleanText.length < 3) {
          result.push(null);
        } else {
          const embedding = embeddings[cleanTextIndex];
          result.push(embedding || null);
          cleanTextIndex++;
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Error generating embeddings:', error.message);
      return texts.map(() => null);
    }
  }

  calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private cleanText(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,!?]/g, '')
      .toLowerCase();
  }

  chunkText(text: string, maxChunkSize: number = 500): string[] {
    const cleanText = this.cleanText(text);
    if (cleanText.length <= maxChunkSize) {
      return [cleanText];
    }

    const chunks: string[] = [];
    const sentences = cleanText
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 0);

    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();

      if (currentChunk.length + trimmedSentence.length <= maxChunkSize) {
        currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        currentChunk = trimmedSentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks.length > 0 ? chunks : [cleanText.substring(0, maxChunkSize)];
  }

  isAvailable(): boolean {
    return !!this.cohereEmbeddings;
  }
}
