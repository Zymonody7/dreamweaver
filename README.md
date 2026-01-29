# DreamWeaver - Next.js Dream Journal with PostgreSQL

A Next.js application for tracking and analyzing dreams with AI, now with user authentication and PostgreSQL database backend.

## Features

- 🔐 User authentication (register/login)
- 🌙 Dream journal with AI-powered analysis
- 📊 Insights and pattern recognition
- 🌌 Collective dream universe with real user data
- 💾 PostgreSQL database storage
- 🎨 Beautiful UI with Tailwind CSS
- 🌍 Share dreams publicly to the collective universe

## Prerequisites

- Node.js 18+
- PostgreSQL database (using Neon)
- Doubao API key (豆包 API)

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Update `.env.local` with your credentials:
   ```
   DATABASE_URL=postgresql://neondb_owner:npg_GcbThJxfYW92@ep-blue-math-a12p28rj-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   DOUBAO_API_KEY=your_doubao_api_key_here
   ```

3. **Initialize the database:**

   Start the development server and visit:
   ```
   http://localhost:3000/api/init-db
   ```

   This will create all necessary tables in your PostgreSQL database including:
   - `users` - User accounts
   - `sessions` - User sessions
   - `dreams` - Dream entries
   - `dream_analysis` - AI analysis results
   - `dream_symbols` - Extracted symbols

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Register an account:**
   ```
   http://localhost:3000/auth
   ```

6. **Start recording dreams!**

## Database Schema

The application uses five main tables:

- **users**: Stores user accounts with authentication
- **sessions**: Manages user sessions with cookies
- **dreams**: Stores dream entries with user association
- **dream_analysis**: Stores AI-generated analysis for each dream
- **dream_symbols**: Stores extracted symbols from dreams

## API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Dreams
- `GET /api/dreams` - Fetch user's dreams
- `POST /api/dreams` - Create a new dream
- `PUT /api/dreams/[id]` - Update a dream
- `DELETE /api/dreams/[id]` - Delete a dream
- `GET /api/dreams/public` - Fetch public dreams for Universe view

### System
- `GET /api/init-db` - Initialize database tables

## Features in Detail

### User Authentication
- Secure password hashing with SHA-256
- Session-based authentication with HTTP-only cookies
- 7-day session expiration

### Dream Sharing
- Mark dreams as public to share with the collective
- Public dreams appear in the Universe view
- Anonymous sharing - only dream content is visible

### Universe View
- Weaves together your dreams with public dreams from other users
- Uses AI to create a cohesive narrative
- Real-time data from the database (no more mock data!)

## Tech Stack

- **Framework**: Next.js 14
- **Database**: PostgreSQL (Neon)
- **AI**: ByteDance Doubao API (豆包)
- **Styling**: Tailwind CSS
- **Authentication**: Custom session-based auth
- **UI Components**: Lucide React icons
- **Charts**: Recharts, D3.js

## Deployment

This app can be deployed to Vercel or any platform that supports Next.js and PostgreSQL connections.

1. Push your code to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard:
   - `DATABASE_URL`
   - `DOUBAO_API_KEY`
4. Deploy!
5. Visit `/api/init-db` on your deployed URL to initialize the database

## Security Notes

- Passwords are hashed using SHA-256
- Sessions use HTTP-only cookies
- Database connections use SSL
- User data is isolated per account
- Public dreams are anonymous (no user info exposed)

## Notes

- The database connection string is already configured for Neon PostgreSQL
- Make sure to replace the `DOUBAO_API_KEY` with your actual Doubao API key
- The first time you run the app, visit `/api/init-db` to set up the database tables
- Register an account at `/auth` before using the app
- You can share dreams publicly by toggling the "Share to Universe" option when recording
