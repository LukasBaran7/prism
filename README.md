# Prism - Readwise Reader Dashboard

A personal analytics dashboard for your Readwise Reader library. Visualize your reading habits, track progress, and gain insights from your saved documents.

## Features

- **Dashboard Analytics**: View stats on your reading library including documents by location, category, and reading progress
- **Document Sync**: Sync your 30k+ documents from Readwise Reader with incremental updates
- **Charts & Visualizations**: Pie charts, bar charts, and time series data for reading activity
- **Tag Cloud**: See your most-used tags at a glance
- **Recent Documents Table**: Quick access to your latest saved items
- **Daily Cron Sync**: Automatic daily sync via Vercel Cron

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Actions)
- **Database**: PostgreSQL (Neon recommended for free tier)
- **ORM**: Prisma
- **UI**: shadcn/ui + Tailwind CSS v4
- **Charts**: Recharts
- **Deployment**: Vercel

## Getting Started

### Prerequisites

1. Node.js 18+
2. A PostgreSQL database (get a free one at [neon.tech](https://neon.tech))
3. Readwise API token (get it at [readwise.io/access_token](https://readwise.io/access_token))

### Setup

1. **Clone and install dependencies:**
   ```bash
   cd prism
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your database URL:
   ```env
   DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
   ```

3. **Push the database schema:**
   ```bash
   npm run db:push
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

6. **Go to Settings and add your Readwise API token**

7. **Start syncing your documents!**

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |

## Deployment to Vercel

1. **Create a new project on Vercel and connect your repository**

2. **Add environment variables in Vercel:**
   - `DATABASE_URL`: Your Neon PostgreSQL connection string
   - `CRON_SECRET`: A random secret for securing cron endpoints

3. **Deploy!**

The `vercel.json` is already configured to run a daily sync at 6:00 AM UTC.

## Project Structure

```
prism/
├── app/
│   ├── actions/          # Server actions for data operations
│   ├── api/cron/         # Cron job endpoint
│   ├── settings/         # Settings page
│   ├── page.tsx          # Dashboard page
│   └── layout.tsx        # Root layout
├── components/
│   ├── charts/           # Recharts visualizations
│   ├── dashboard/        # Dashboard components
│   ├── documents/        # Document table
│   ├── settings/         # Settings components
│   ├── sync/             # Sync controls
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── db.ts             # Prisma client
│   ├── readwise.ts       # Readwise API client
│   └── utils.ts          # Utility functions
└── prisma/
    └── schema.prisma     # Database schema
```

## Rate Limiting

The Readwise API has a rate limit of 20 requests per minute. The sync engine automatically handles this by:
- Waiting 3 seconds between requests
- Automatically retrying on 429 responses
- Showing progress during long syncs

Initial sync of 30k+ documents will take approximately 20-30 minutes.

## Future Features

- [ ] LLM-powered document summarization
- [ ] Obsidian export
- [ ] Semantic search with embeddings
- [ ] Reading recommendations
- [ ] Highlight management

## License

MIT
