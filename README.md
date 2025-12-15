# CodeLink ServiceHub

**SaaS Customer Support & Warranty Claim Management System**

A comprehensive platform for manufacturing and industrial equipment companies to manage warranty claims, customer support, and service operations.

## Features

- **Multi-Tenant Architecture** - Isolated data and configurations per company
- **Dynamic Workflow Engine** - Companies define their own warranty/service processes
- **End-to-End Tracking** - Complete visibility from sale to warranty resolution
- **Role-Based Access Control** - Customizable roles and permissions
- **Real-time Notifications** - SMS and in-app notifications at every stage

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Database:** MySQL with Prisma ORM
- **Authentication:** NextAuth.js v5

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL 8+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/smsdahanayaka/CodeLink_ServiceHub.git
cd CodeLink_ServiceHub
```

2. Install dependencies:
```bash
npm install
```

3. Create MySQL database:
```sql
CREATE DATABASE codelink_servicehub;
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. Generate Prisma client:
```bash
npm run db:generate
```

6. Push schema to database:
```bash
npm run db:push
```

7. Seed the database:
```bash
npm run db:seed
```

8. Start development server:
```bash
npm run dev
```

## Demo Login

| Field | Value |
|-------|-------|
| Company Code | demo |
| Email | admin@demo.codelink.com |
| Password | admin123 |

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, etc.)
│   ├── (dashboard)/       # Dashboard pages
│   └── api/               # API routes
├── components/
│   ├── common/            # Shared components
│   ├── layout/            # Layout components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities and configs
├── types/                 # TypeScript types
└── middleware.ts          # Route protection

prisma/
├── schema.prisma          # Database schema
└── seed.ts               # Seed script
```

## License

Proprietary - CodeLink

## Support

For support, contact support@codelink.com


Next Steps to Run

  1. Create MySQL database:
  CREATE DATABASE codelink_servicehub;

  2. Update .env with your database credentials
  3. Push schema and seed:
  npm run db:push
  npm run db:seed

  4. Start development server:
  npm run dev

  Demo Login

  | Field        | Value                   |
  |--------------|-------------------------|
  | Company Code | demo                    |
  | Email        | admin@demo.codelink.com |
  | Password     | admin123                |

  The project builds successfully and is ready for Phase 2 development (User & Role Management modules).