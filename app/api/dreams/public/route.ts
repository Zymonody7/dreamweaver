import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET public dreams for Universe view
export async function GET(request: NextRequest) {
  try {
    const limit = request.nextUrl.searchParams.get('limit') || '10';

    const result = await query(`
      SELECT
        d.id,
        d.content,
        d.mood,
        d.timestamp,
        da.themes
      FROM dreams d
      LEFT JOIN dream_analysis da ON d.id = da.dream_id
      WHERE d.is_public = true
      ORDER BY d.timestamp DESC
      LIMIT $1
    `, [parseInt(limit)]);

    const publicDreams = result.rows.map(row => ({
      id: row.id,
      content: row.content,
      mood: row.mood,
      timestamp: parseInt(row.timestamp),
      themes: row.themes || []
    }));

    return NextResponse.json(publicDreams);
  } catch (error) {
    console.error('Error fetching public dreams:', error);
    return NextResponse.json({ error: 'Failed to fetch public dreams' }, { status: 500 });
  }
}
