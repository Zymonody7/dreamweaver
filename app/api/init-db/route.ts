import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/init-db';

export async function GET() {
  try {
    const result = await initDatabase();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message || 'Database initialized successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to initialize database' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
