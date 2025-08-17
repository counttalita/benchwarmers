# BenchWarmers Marketplace

A B2B talent marketplace connecting companies with benched professionals to organizations seeking specialized skills.

## Tech Stack

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Fastify + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js + JWT + 2FA
- **Payments**: Stripe + Stripe Connect
- **File Storage**: Appwrite Storage
- **Real-time**: Pusher
- **Email**: Resend

## Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd benchwarmers-marketplace
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env.local
```

4. Start the development environment:
```bash
npm run setup
```

This command will:
- Start PostgreSQL and Redis containers
- Push the database schema
- Generate Prisma client

5. Seed the database (optional):
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with test data
- `npm run docker:up` - Start Docker containers
- `npm run docker:down` - Stop Docker containers
- `npm run setup` - Complete development setup

## Project Structure

```
src/
├── app/                 # Next.js app directory
├── components/          # React components
├── lib/                 # Utility functions
├── types/              # TypeScript type definitions
└── generated/          # Generated Prisma client

prisma/
├── schema.prisma       # Database schema
└── seed.ts            # Database seeding

docker/
└── init.sql           # Database initialization
```

## Environment Variables

See `.env.example` for all required environment variables. Key variables include:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret key
- `STRIPE_SECRET_KEY` - Stripe API key
- `RESEND_API_KEY` - Resend email API key
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID` - Appwrite project ID
- `APPWRITE_API_KEY` - Appwrite API key

## Development

The project uses:
- TypeScript for type safety
- Prisma for database operations
- Tailwind CSS for styling
- shadcn/ui for UI components
- ESLint for code linting

## Database

The application uses PostgreSQL with Prisma ORM. The schema includes:
- Companies (providers/seekers)
- Users with role-based access
- Talent profiles and requests
- Matching engine
- Offers and payments
- Engagements and reviews

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
