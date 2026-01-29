import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { Dream, DreamAnalysis } from '@/types';
import { getUserBySession } from '@/lib/auth';
import { vectorizeDream, updatePublicDreamVector } from '@/services/vectorService';

// Helper function to sanitize symbol types to match database constraint
const sanitizeSymbolType = (type: string): 'person' | 'place' | 'object' | 'action' => {
  const lowerType = type.toLowerCase();

  // Map various types to valid database values
  if (lowerType.includes('person') || lowerType.includes('character') || lowerType.includes('being')) {
    return 'person';
  }
  if (lowerType.includes('place') || lowerType.includes('location') || lowerType.includes('setting')) {
    return 'place';
  }
  if (lowerType.includes('action') || lowerType.includes('activity') || lowerType.includes('event')) {
    return 'action';
  }
  // Default to 'object' for anything else (including 'object/element', 'thing', etc.)
  return 'object';
};

// GET all dreams for current user
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserBySession(sessionId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(`
      SELECT
        d.*,
        da.emotional_analysis,
        da.creative_story,
        da.themes,
        json_agg(
          json_build_object(
            'name', ds.name,
            'meaning', ds.meaning,
            'type', ds.type
          )
        ) FILTER (WHERE ds.id IS NOT NULL) as symbols
      FROM dreams d
      LEFT JOIN dream_analysis da ON d.id = da.dream_id
      LEFT JOIN dream_symbols ds ON d.id = ds.dream_id
      WHERE d.user_id = $1
      GROUP BY d.id, da.emotional_analysis, da.creative_story, da.themes
      ORDER BY d.timestamp DESC
    `, [user.id]);

    const dreams: Dream[] = result.rows.map(row => ({
      id: row.id,
      timestamp: parseInt(row.timestamp),
      content: row.content,
      mood: row.mood,
      clarity: row.clarity,
      isRecurring: row.is_recurring,
      imageUrl: row.image_url,
      isPublic: row.is_public,
      realityConnection: row.reality_connection,
      analysis: row.emotional_analysis ? {
        emotionalAnalysis: row.emotional_analysis,
        creativeStory: row.creative_story,
        themes: row.themes || [],
        symbols: row.symbols || [],
        moods: []
      } : undefined
    }));

    return NextResponse.json(dreams);
  } catch (error) {
    console.error('Error fetching dreams:', error);
    return NextResponse.json({ error: 'Failed to fetch dreams' }, { status: 500 });
  }
}

// POST create new dream
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
    const { id, timestamp, content, mood, clarity, isRecurring, imageUrl, analysis, isPublic } = body;

    // Insert dream with user_id
    await query(
      `INSERT INTO dreams (id, user_id, timestamp, content, mood, clarity, is_recurring, image_url, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, user.id, timestamp, content, mood, clarity, isRecurring, imageUrl, isPublic || false]
    );

    // Insert analysis if provided
    if (analysis) {
      await query(
        `INSERT INTO dream_analysis (dream_id, emotional_analysis, creative_story, themes)
         VALUES ($1, $2, $3, $4)`,
        [id, analysis.emotionalAnalysis, analysis.creativeStory, analysis.themes]
      );

      // Insert symbols
      if (analysis.symbols && analysis.symbols.length > 0) {
        for (const symbol of analysis.symbols) {
          // Sanitize the type to ensure it matches database constraint
          const sanitizedType = sanitizeSymbolType(symbol.type);
          await query(
            `INSERT INTO dream_symbols (dream_id, name, meaning, type)
             VALUES ($1, $2, $3, $4)`,
            [id, symbol.name, symbol.meaning, sanitizedType]
          );
        }
      }
    }

    // Vectorize the dream for semantic search
    const dreamForVectorization: Dream = {
      id,
      timestamp,
      content,
      mood,
      clarity,
      isRecurring,
      imageUrl,
      isPublic: isPublic || false,
      analysis,
    };

    // Vectorize asynchronously (don't block the response)
    vectorizeDream(dreamForVectorization, user.id).catch(err => {
      console.error('Failed to vectorize dream:', err);
    });

    // If public, also add to public namespace
    if (isPublic) {
      updatePublicDreamVector(dreamForVectorization, user.id, true).catch(err => {
        console.error('Failed to update public dream vector:', err);
      });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating dream:', error);
    return NextResponse.json({ error: 'Failed to create dream' }, { status: 500 });
  }
}
