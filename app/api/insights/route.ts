import { NextRequest, NextResponse } from 'next/server';
import { getUserBySession } from '@/lib/auth';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/insights
 * Save a pattern analysis insight
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
    const { analysis } = body;

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis is required' }, { status: 400 });
    }

    const id = uuidv4();

    // Save to database
    await query(
      `INSERT INTO pattern_insights (id, user_id, analysis, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET analysis = $3, created_at = NOW()`,
      [id, user.id, analysis]
    );

    return NextResponse.json({
      success: true,
      id,
      message: 'Insight saved successfully'
    });
  } catch (error) {
    console.error('Error saving insight:', error);
    return NextResponse.json(
      { error: 'Failed to save insight' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/insights
 * Get user's latest pattern analysis
 */
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

    // Get user's latest insight
    const result = await query(
      `SELECT id, analysis, created_at
       FROM pattern_insights
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ insight: null });
    }

    return NextResponse.json({
      insight: {
        id: result.rows[0].id,
        analysis: result.rows[0].analysis,
        createdAt: new Date(result.rows[0].created_at).getTime()
      }
    });
  } catch (error) {
    console.error('Error fetching insight:', error);
    return NextResponse.json(
      { error: 'Failed to fetch insight' },
      { status: 500 }
    );
  }
}
