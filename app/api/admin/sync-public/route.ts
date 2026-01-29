import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { updatePublicDreamVector } from '@/services/vectorService';

// POST /api/admin/sync-public
// Body: { secret: "..." } - secret should match process.env.ADMIN_SYNC_SECRET
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const provided = String(body?.secret || '');
    const expected = process.env.ADMIN_SYNC_SECRET || '';

    if (!expected || provided !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all public dreams with their analysis and symbols
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
      WHERE d.is_public = true
      GROUP BY d.id, da.emotional_analysis, da.creative_story, da.themes
      ORDER BY d.timestamp DESC
    `, []);

    const rows = result.rows || [];
    const synced: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const row of rows) {
      const dream = {
        id: row.id,
        timestamp: parseInt(row.timestamp),
        content: row.content,
        mood: row.mood,
        clarity: row.clarity,
        isRecurring: row.is_recurring,
        imageUrl: row.image_url,
        isPublic: true,
        analysis: row.emotional_analysis ? {
          emotionalAnalysis: row.emotional_analysis,
          creativeStory: row.creative_story,
          themes: row.themes || [],
          symbols: row.symbols || [],
          moods: []
        } : undefined
      };

      try {
        await updatePublicDreamVector(dream as any, row.user_id, true);
        synced.push(row.id);
      } catch (err: any) {
        errors.push({ id: row.id, error: String(err) });
      }
    }

    return NextResponse.json({ ok: true, syncedCount: synced.length, errors });
  } catch (error) {
    console.error('Error syncing public dreams to Pinecone:', error);
    return NextResponse.json({ error: 'Failed to sync public dreams' }, { status: 500 });
  }
}

