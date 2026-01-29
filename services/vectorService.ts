import { getDreamIndex } from '@/lib/pinecone';
import { Dream } from '@/types';

/**
 * Vectorize and upsert a dream to Pinecone
 * Uses Pinecone's built-in embedding model (llama-text-embed-v2)
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

    // Upsert to Pinecone with automatic embedding using upsertRecords
    // Using namespace per user for data isolation
    await index.namespace(`user_${userId}`).upsertRecords([
      {
        _id: dream.id,
        content: textContent, // This field will be embedded automatically
        mood: dream.mood,
        clarity: dream.clarity,
        themes: dream.analysis?.themes?.join(',') || '', // Store as comma-separated string
        emotionalAnalysis: dream.analysis?.emotionalAnalysis || '',
        creativeStory: dream.analysis?.creativeStory || '',
        symbols: dream.analysis?.symbols?.map(s => s.name).join(',') || '', // Store as comma-separated string
        imageUrl: dream.imageUrl || '',
        timestamp: dream.timestamp,
        isPublic: dream.isPublic || false,
        userId: userId,
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

    // Search in user's namespace using searchRecords (text input)
    const userSearch = await index.namespace(`user_${userId}`).searchRecords({
      query: {
        topK: limit,
        inputs: { text: dreamContent },
      },
    });

    let userHits = userSearch?.result?.hits || [];

    // Optionally include public dreams from other users
    let publicHits: any[] = [];
    if (includePublic && userHits.length < limit) {
      const publicSearch = await index.namespace('public').searchRecords({
        query: {
          topK: limit - userHits.length,
          inputs: { text: dreamContent },
          filter: { isPublic: { $eq: true } },
        },
      });
      publicHits = publicSearch?.result?.hits || [];
    }

    const hits = [...userHits, ...publicHits];

    return {
      success: true,
      dreams: hits.map((hit: any) => ({
        id: hit._id || hit.id,
        score: hit._score || hit.score || 0,
        metadata: (hit.fields as Record<string, any>) || hit.metadata || {},
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
      // Copy to public namespace using upsertRecords
      await index.namespace('public').upsertRecords([
        {
          _id: dream.id,
          content: dream.content, // This field will be embedded automatically
          mood: dream.mood,
          clarity: dream.clarity,
          themes: dream.analysis?.themes?.join(',') || '',
          emotionalAnalysis: dream.analysis?.emotionalAnalysis || '',
          creativeStory: dream.analysis?.creativeStory || '',
          symbols: dream.analysis?.symbols?.map(s => s.name).join(',') || '',
          imageUrl: dream.imageUrl || '',
          timestamp: dream.timestamp,
          isPublic: true,
          userId: userId,
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
