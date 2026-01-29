import { NextRequest, NextResponse } from 'next/server';
import { getUserBySession } from '@/lib/auth';
import { query } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/collective-dreams
 * Save a collective dream story to the database
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
    const { story, dreamIds } = body;

    if (!story) {
      return NextResponse.json({ error: 'Story is required' }, { status: 400 });
    }

    // Generate a unique ID for the collective dream
    const id = uuidv4();

    // Save to database
    await query(
      `INSERT INTO collective_dreams (id, user_id, story, dream_ids, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, user.id, story, dreamIds || []]
    );

    return NextResponse.json({
      success: true,
      id,
      message: 'Collective dream saved successfully'
    });
  } catch (error) {
    console.error('Error saving collective dream:', error);
    return NextResponse.json(
      { error: 'Failed to save collective dream' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/collective-dreams
 * Get user's collective dreams
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

    // Get user's collective dreams
    const result = await query(
      `SELECT id, story, dream_ids, created_at
       FROM collective_dreams
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [user.id]
    );

    return NextResponse.json({
      collectiveDreams: result.rows.map(row => ({
        id: row.id,
        story: row.story,
        dreamIds: row.dream_ids,
        createdAt: new Date(row.created_at).getTime()
      }))
    });
  } catch (error) {
    console.error('Error fetching collective dreams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collective dreams' },
      { status: 500 }
    );
  }
}
