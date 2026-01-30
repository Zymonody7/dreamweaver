import { getDreamIndex } from '@/lib/pinecone';
import { Dream } from '@/types';

/**
 * Generate embeddings using Doubao AI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const apiKey = process.env.DOUBAO_API_KEY;
    if (!apiKey) {
      throw new Error('DOUBAO_API_KEY not configured');
    }

    // Use multimodal embeddings API for doubao-embedding-vision model
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/embeddings/multimodal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'doubao-embedding-vision-250615',
        input: [
          {
            type: 'text',
            text: text,
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Embedding API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Log response for debugging
    console.log('Embedding API response:', JSON.stringify(data).substring(0, 200));

    // Handle different response formats
    // Multimodal API returns: { data: { embedding: [...] } }
    if (data.data && data.data.embedding) {
      return data.data.embedding;
    } else if (data.data && data.data[0] && data.data[0].embedding) {
      return data.data[0].embedding;
    } else if (data.embedding) {
      return data.embedding;
    } else if (Array.isArray(data) && data[0] && data[0].embedding) {
      return data[0].embedding;
    } else {
      throw new Error(`Unexpected embedding response format: ${JSON.stringify(data).substring(0, 200)}`);
    }
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Vectorize and upsert a dream to Pinecone
 * Uses Doubao AI for embeddings
 */
export async function vectorizeDream(dream: Dream, userId: string) {
  try {
    const index = await getDreamIndex();

    // Prepare the text content for embedding
    const textContent = `
      ${dream.content}
      Mood: ${dream.mood}
      Themes: ${dream.analysis?.themes.join(', ') || ''}
      Symbols: ${dream.analysis?.symbols.map(s => s.name).join(', ') || ''}
      Emotional Analysis: ${dream.analysis?.emotionalAnalysis || ''}
    `.trim();

    // Generate embedding
    const embedding = await generateEmbedding(textContent);

    // Upsert to Pinecone using standard API
    // Using namespace per user for data isolation
    await index.namespace(`user_${userId}`).upsert([
      {
        id: dream.id,
        values: embedding,
        metadata: {
          content: dream.content.substring(0, 1000), // Limit content length
          mood: dream.mood,
          clarity: dream.clarity,
          themes: dream.analysis?.themes?.join(',') || '',
          emotionalAnalysis: dream.analysis?.emotionalAnalysis?.substring(0, 500) || '',
          creativeStory: dream.analysis?.creativeStory?.substring(0, 500) || '',
          symbols: dream.analysis?.symbols?.map(s => s.name).join(',') || '',
          imageUrl: dream.imageUrl || '',
          timestamp: dream.timestamp,
          isPublic: dream.isPublic || false,
          userId: userId,
        },
      },
    ]);

    console.log(`Dream ${dream.id} vectorized successfully`);
    return { success: true };
  } catch (error) {
    console.error('Error vectorizing dream:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Find similar dreams using semantic search
 */
export async function findSimilarDreams(
  dreamContent: string,
  userId: string,
  limit: number = 5,
  includePublic: boolean = false
) {
  try {
    const index = await getDreamIndex();

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(dreamContent);

    console.log('Query embedding generated, length:', queryEmbedding.length);
    console.log('First few values:', queryEmbedding.slice(0, 5));

    // Check if namespace has any vectors first
    const stats = await index.describeIndexStats();
    console.log('Index stats:', JSON.stringify(stats));

    const userNamespace = `user_${userId}`;
    const hasUserVectors = stats.namespaces && stats.namespaces[userNamespace] && stats.namespaces[userNamespace].recordCount > 0;

    let userMatches: any[] = [];

    if (hasUserVectors) {
      // Search in user's namespace using standard query API
      const userSearch = await index.namespace(userNamespace).query({
        topK: limit,
        vector: queryEmbedding,
        includeMetadata: true,
      });
      userMatches = userSearch?.matches || [];
    } else {
      console.log(`No vectors found in namespace ${userNamespace}`);
    }

    // Optionally include public dreams from other users
    let publicMatches: any[] = [];
    if (includePublic && userMatches.length < limit) {
      const hasPublicVectors = stats.namespaces && stats.namespaces['public'] && stats.namespaces['public'].recordCount > 0;

      if (hasPublicVectors) {
        const publicSearch = await index.namespace('public').query({
          vector: queryEmbedding,
          topK: limit - userMatches.length,
          includeMetadata: true,
          filter: { isPublic: { $eq: true } },
        });
        publicMatches = publicSearch?.matches || [];
      }
    }

    const matches = [...userMatches, ...publicMatches];

    return {
      success: true,
      dreams: matches.map((match: any) => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata || {},
      })),
    };
  } catch (error) {
    console.error('Error finding similar dreams:', error);
    return { success: false, error: String(error), dreams: [] };
  }
}

/**
 * Delete a dream from Pinecone
 */
export async function deleteDreamVector(dreamId: string, userId: string) {
  try {
    const index = await getDreamIndex();
    await index.namespace(`user_${userId}`).deleteOne(dreamId);

    console.log(`Dream vector ${dreamId} deleted successfully`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting dream vector:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update public dream vectors
 * When a dream is made public, copy it to the public namespace
 */
export async function updatePublicDreamVector(dream: Dream, userId: string, isPublic: boolean) {
  try {
    const index = await getDreamIndex();

    if (isPublic) {
      // Prepare the text content for embedding
      const textContent = `
        ${dream.content}
        Mood: ${dream.mood}
        Themes: ${dream.analysis?.themes.join(', ') || ''}
        Symbols: ${dream.analysis?.symbols.map(s => s.name).join(', ') || ''}
        Emotional Analysis: ${dream.analysis?.emotionalAnalysis || ''}
      `.trim();

      // Generate embedding
      const embedding = await generateEmbedding(textContent);

      // Copy to public namespace using standard API
      await index.namespace('public').upsert([
        {
          id: dream.id,
          values: embedding,
          metadata: {
            content: dream.content.substring(0, 1000),
            mood: dream.mood,
            clarity: dream.clarity,
            themes: dream.analysis?.themes?.join(',') || '',
            emotionalAnalysis: dream.analysis?.emotionalAnalysis?.substring(0, 500) || '',
            creativeStory: dream.analysis?.creativeStory?.substring(0, 500) || '',
            symbols: dream.analysis?.symbols?.map(s => s.name).join(',') || '',
            imageUrl: dream.imageUrl || '',
            timestamp: dream.timestamp,
            isPublic: true,
            userId: userId,
          },
        },
      ]);
    } else {
      // Remove from public namespace
      await index.namespace('public').deleteOne(dream.id);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating public dream vector:', error);
    return { success: false, error: String(error) };
  }
}
