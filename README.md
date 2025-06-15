# Lost Trace API

## Overview

Lost Trace is a missing persons reporting system that leverages facial recognition technology to help identify potential matches between submitted reports. The system includes user authentication, report management, real-time notifications, and biometric matching capabilities.

## Data Enrichment Strategy

To improve matching accuracy and expand our dataset, we implement ethical data collection from public platforms:
**Public Community Scraping**  
 We scrape publicly shared missing person posts from platforms like [Facebook - Atfal Mafkoda](https://www.facebook.com/atfalmafkoda) to:

- Expand our database with additional cases
- Enhance facial recognition training data
- Enable cross-referencing with community-submitted reports

## Key Features

- User registration and authentication (JWT-based)
- Facial recognition powered report matching
- Cloudinary image storage integration
- Email and SMS notifications via Nodemailer/Twilio
- Role-based access control (User/Admin/POLICE)
- Real-time updates via WebSocket

## Tech Stack

- Backend : TypeScript, Node.js, Express
- Database : PostgreSQL with Prisma ORM
- Image Processing : Cloudinary, face-api.js (TensorFlow)
- Messaging : Twilio (SMS), Nodemailer (Email)
- Real-time : Socket.IO
- Testing: Vitest with comprehensive coverage
- Logging: Winston with daily file rotation

## Setup Instructions

### 1. Clone the repository

```bash
git clone git@github.com:Lost-trace-GP/Server.git
cd lost-trace-api
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Database (PostgreSQL)
DATABASE_URL="postgresql://lostuser:root@localhost:5432/lostfounddb?sslmode=disable"

# Server
PORT=3000
NODE_ENV=development

# Authentication
JWT_SECRET=your_strong_secret_here  # Generate with: openssl rand -base64 32
JWT_EXPIRES_IN=1d

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email (Gmail Example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
FRONTEND_URL=http://localhost:3001
```

Adjust the DATABASE_URL according to your PostgreSQL setup.

### 4. Database Setup

Initialize the database and generate the Prisma client:

```bash
pnpm prisma:migrate
pnpm prisma:generate
```

### 5. Development

#### Start development server

```bash
pnpm dev

# Build production version

pnpm build

# Run production server

pnpm start

```

```bash
#### Testing

# Run tests

pnpm test

# Run tests with coverage

pnpm test:coverage

# Interactive test UI

pnpm test:ui
```

The API will be available at http://localhost:3000.
