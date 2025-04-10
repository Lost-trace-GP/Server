## Setup Instructions

### 1. Clone the repository

```bash
git clone git@github.com:Lost-trace-GP/Backend.git
cd lost-trace-api
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/dbName"

# Server
PORT=3000
NODE_ENV=development
```

Adjust the DATABASE_URL according to your PostgreSQL setup.

### 4. Database Setup

Initialize the database and generate the Prisma client:

```bash
pnpm prisma:migrate
pnpm prisma:generate
```

### 5. Run the API

Start the development server:

```bash
pnpm dev
```

The API will be available at http://localhost:3000.
