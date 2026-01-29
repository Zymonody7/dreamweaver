import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserBySession } from '@/lib/auth';

// Helper function to sanitize symbol types
const sanitizeSymbolType = (type: string): 'person' | 'place' | 'object' | 'action' => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('person') || lowerType.includes('character') || lowerType.includes('being')) {
    return 'person';
  }
  if (lowerType.includes('place') || lowerType.includes('location') || lowerType.includes('setting')) {
    return 'place';
  }
  if (lowerType.includes('action') || lowerType.includes('activity') || lowerType.includes('event')) {
    return 'action';
  }
  return 'object';
};

// PUT update dream
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const {
      content,
      mood,
      clarity,
      isRecurring,
      isPublic,
      realityConnection,
      analysis
    } = body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (mood !== undefined) {
      updates.push(`mood = $${paramIndex++}`);
      values.push(mood);
    }
    if (clarity !== undefined) {
      updates.push(`clarity = $${paramIndex++}`);
      values.push(clarity);
    }
    if (isRecurring !== undefined) {
      updates.push(`is_recurring = $${paramIndex++}`);
      values.push(isRecurring);
    }
    if (isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(isPublic);
    }
    if (realityConnection !== undefined) {
      updates.push(`reality_connection = $${paramIndex++}`);
      values.push(realityConnection);
    }

    // Always update updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(params.id);

    if (updates.length > 1) { // More than just updated_at
      await query(
        `UPDATE dreams SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        [...values, user.id]
      );
    }

    // Update analysis if provided
    if (analysis) {
      const { emotionalAnalysis, creativeStory, themes, symbols } = analysis;

      // Check if analysis exists
      const existingAnalysis = await query(
        `SELECT id FROM dream_analysis WHERE dream_id = $1`,
        [params.id]
      );

      if (existingAnalysis.rows.length > 0) {
        // Update existing analysis
        const analysisUpdates: string[] = [];
        const analysisValues: any[] = [];
        let analysisParamIndex = 1;

        if (emotionalAnalysis !== undefined) {
          analysisUpdates.push(`emotional_analysis = $${analysisParamIndex++}`);
          analysisValues.push(emotionalAnalysis);
        }
        if (creativeStory !== undefined) {
          analysisUpdates.push(`creative_story = $${analysisParamIndex++}`);
          analysisValues.push(creativeStory);
        }
        if (themes !== undefined) {
          analysisUpdates.push(`themes = $${analysisParamIndex++}`);
          analysisValues.push(themes);
        }

        if (analysisUpdates.length > 0) {
          analysisValues.push(params.id);
          await query(
            `UPDATE dream_analysis SET ${analysisUpdates.join(', ')} WHERE dream_id = $${analysisParamIndex}`,
            analysisValues
          );
        }
      } else {
        // Create new analysis
        await query(
          `INSERT INTO dream_analysis (dream_id, emotional_analysis, creative_story, themes)
           VALUES ($1, $2, $3, $4)`,
          [params.id, emotionalAnalysis, creativeStory, themes]
        );
      }

      // Update symbols if provided
      if (symbols !== undefined) {
        // Delete old symbols
        await query(`DELETE FROM dream_symbols WHERE dream_id = $1`, [params.id]);

        // Insert new symbols
        if (symbols.length > 0) {
          for (const symbol of symbols) {
            const sanitizedType = sanitizeSymbolType(symbol.type);
            await query(
              `INSERT INTO dream_symbols (dream_id, name, meaning, type)
               VALUES ($1, $2, $3, $4)`,
              [params.id, symbol.name, symbol.meaning, sanitizedType]
            );
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating dream:', error);
    return NextResponse.json({ error: 'Failed to update dream' }, { status: 500 });
  }
}

// DELETE dream
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = request.cookies.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserBySession(sessionId);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete dream (CASCADE will delete related records)
    await query(`DELETE FROM dreams WHERE id = $1 AND user_id = $2`, [params.id, user.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dream:', error);
    return NextResponse.json({ error: 'Failed to delete dream' }, { status: 500 });
  }
}
