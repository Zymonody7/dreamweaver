import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET public dreams for Universe view (includes analysis)
export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get('limit') || '10';

    const result = await query(`
      SELECT
        d.id,
        d.content,
        d.mood,
        d.clarity,
        d.is_recurring,
        d.is_public,
        d.reality_connection,
        d.image_url,
        d.timestamp,
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
      WHERE d.is_public = true
      GROUP BY d.id, da.emotional_analysis, da.creative_story, da.themes
      ORDER BY d.timestamp DESC
      LIMIT $1
    `, [parseInt(limit)]);

    const publicDreams = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      mood: row.mood,
      clarity: row.clarity,
      isRecurring: row.is_recurring,
      isPublic: row.is_public,
      realityConnection: row.reality_connection,
      imageUrl: row.image_url || null,
      timestamp: parseInt(row.timestamp),
      analysis: row.emotional_analysis ? {
        emotionalAnalysis: row.emotional_analysis,
        creativeStory: row.creative_story || '',
        themes: row.themes || [],
        symbols: row.symbols || [],
        moods: []
      } : undefined
    }));

    return NextResponse.json(publicDreams);
  } catch (error) {
    console.error('Error fetching public dreams:', error);
    return NextResponse.json({ error: 'Failed to fetch public dreams' }, { status: 500 });
  }
}
