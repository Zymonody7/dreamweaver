import { query } from './db';

export async function initDatabase() {
  try {
    // SAFE MODE: Only create tables if they don't exist
    // This prevents data loss on accidental calls

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create dreams table with user_id
    await query(`
      CREATE TABLE IF NOT EXISTS dreams (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        timestamp BIGINT NOT NULL,
        content TEXT NOT NULL,
        mood VARCHAR(100) NOT NULL,
        clarity INTEGER NOT NULL CHECK (clarity >= 1 AND clarity <= 5),
        is_recurring BOOLEAN DEFAULT FALSE,
        image_url TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        reality_connection TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create dream_analysis table
    await query(`
      CREATE TABLE IF NOT EXISTS dream_analysis (
        id SERIAL PRIMARY KEY,
        dream_id VARCHAR(255) REFERENCES dreams(id) ON DELETE CASCADE,
        emotional_analysis TEXT,
        creative_story TEXT,
        themes TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create dream_symbols table
    await query(`
      CREATE TABLE IF NOT EXISTS dream_symbols (
        id SERIAL PRIMARY KEY,
        dream_id VARCHAR(255) REFERENCES dreams(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        meaning TEXT,
        type VARCHAR(50) CHECK (type IN ('person', 'place', 'object', 'action')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create collective_dreams table
    await query(`
      CREATE TABLE IF NOT EXISTS collective_dreams (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        story TEXT NOT NULL,
        dream_ids TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create pattern_insights table
    await query(`
      CREATE TABLE IF NOT EXISTS pattern_insights (
        id VARCHAR(255) PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        analysis TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes (IF NOT EXISTS)
    await query(`CREATE INDEX IF NOT EXISTS idx_dreams_user_id ON dreams(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dreams_timestamp ON dreams(timestamp)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dreams_public ON dreams(is_public)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dream_analysis_dream_id ON dream_analysis(dream_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_dream_symbols_dream_id ON dream_symbols(dream_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_collective_dreams_user_id ON collective_dreams(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_collective_dreams_created_at ON collective_dreams(created_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_pattern_insights_user_id ON pattern_insights(user_id)`);

    console.log('Database initialized successfully');
    return { success: true, message: 'All tables created successfully' };
  } catch (error: any) {
    console.error('Database initialization error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}
