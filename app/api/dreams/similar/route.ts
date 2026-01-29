import { NextRequest, NextResponse } from 'next/server';
import { getUserBySession } from '@/lib/auth';
import { findSimilarDreams } from '@/services/vectorService';
import { query } from '@/lib/db';

/**
 * POST /api/dreams/similar
 * Find dreams similar to the provided content using vector search
 */
export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserBySession(sessionId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dreamContent, dreamId, limit = 5, includePublic = false } = body;

    if (!dreamContent) {
      return NextResponse.json({ error: 'Dream content is required' }, { status: 400 });
    }

    // Find similar dreams using vector search
    const vectorResults = await findSimilarDreams(
      dreamContent,
      user.id,
      limit + 1, // Get one extra to filter out the current dream
      includePublic
    );

    if (!vectorResults.success) {
      return NextResponse.json({ error: 'Vector search failed', details: vectorResults.error }, { status: 500 });
    }

    // Filter out the current dream if dreamId is provided
    const filteredResults = vectorResults.dreams.filter(d => d.id !== dreamId);

    // Fetch full dream details from database for the top matches
    const dreamIds = filteredResults.slice(0, limit).map(d => d.id);

    if (dreamIds.length === 0) {
      return NextResponse.json({ dreams: [] });
    }

    // Build query to fetch dreams
    const placeholders = dreamIds.map((_, i) => `$${i + 1}`).join(',');
    const dreamsResult = await query(
      `SELECT
        d.id, d.content, d.mood, d.clarity, d.is_recurring, d.is_public,
        d.reality_connection, d.timestamp, d.image_url,
        da.themes, da.emotional_analysis, da.creative_story,
        ARRAY_AGG(
          json_build_object(
            'name', ds.name,
            'meaning', ds.meaning,
            'type', ds.type
          )
        ) FILTER (WHERE ds.id IS NOT NULL) as symbols
      FROM dreams d
      LEFT JOIN dream_analysis da ON d.id = da.dream_id
      LEFT JOIN dream_symbols ds ON d.id = ds.dream_id
      WHERE d.id = ANY($1::text[])
      GROUP BY d.id, da.id`,
      [dreamIds]
    );

    // Map results with similarity scores
    const dreamsWithScores = dreamsResult.rows.map(row => {
      const vectorMatch = filteredResults.find(v => v.id === row.id);
      return {
        id: row.id,
        timestamp: new Date(row.timestamp).getTime(),
        content: row.content,
        mood: row.mood,
        clarity: row.clarity,
        isRecurring: row.is_recurring,
        isPublic: row.is_public,
        realityConnection: row.reality_connection,
        imageUrl: row.image_url,
        analysis: {
          themes: row.themes || [],
          emotionalAnalysis: row.emotional_analysis || '',
          creativeStory: row.creative_story || '',
          symbols: row.symbols || [],
        },
        similarityScore: vectorMatch?.score || 0,
      };
    });

    // Sort by similarity score
    dreamsWithScores.sort((a, b) => b.similarityScore - a.similarityScore);

    return NextResponse.json({ dreams: dreamsWithScores });
  } catch (error) {
    console.error('Error finding similar dreams:', error);
    return NextResponse.json({ error: 'Failed to find similar dreams' }, { status: 500 });
  }
}
