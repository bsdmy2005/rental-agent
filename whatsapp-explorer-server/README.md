# WhatsApp Explorer Server

A standalone Express.js server for WhatsApp Explorer functionality using the [Baileys](https://github.com/WhiskeySockets/Baileys) library. This server provides a REST API for connecting to WhatsApp, sending/receiving messages, and configuring AI-powered auto-responses.

## Features

- QR code-based WhatsApp connection
- Send and receive text messages
- Message history storage in PostgreSQL
- AI-powered auto-responses using OpenAI
- Session persistence (reconnect without re-scanning QR)
- REST API for integration with other applications
- Accepts all session types (not limited to primary sessions)

## Prerequisites

- Node.js 17+
- PostgreSQL database (shared with Rental Agent AI)
- The database schema must include `whatsapp_sessions` and `whatsapp_explorer_messages` tables

## Installation

```bash
cd whatsapp-explorer-server
npm install
```

## Configuration

1. Copy the environment example file:
```bash
cp .env.example .env
```

2. Configure the environment variables:

```env
# Server Configuration
WHATSAPP_EXPLORER_SERVER_PORT=3002
WHATSAPP_EXPLORER_SERVER_API_KEY=your-secure-api-key-here

# Database (same as your Next.js app)
DATABASE_URL=postgresql://user:password@localhost:5432/database

# Next.js App URL (for CORS)
NEXTJS_APP_URL=http://localhost:3000

# OpenAI (for AI auto-responses)
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4

# Logging
LOG_LEVEL=info
```

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## API Endpoints

Same as the incident-dispatch server, but accepts all session types (not just primary).

See the main WhatsApp server README for API documentation.

## Usage with Next.js App

The Next.js app (Rental Agent AI) includes a WhatsApp Explorer page that connects to this server:

1. Start this server: `npm run dev` (in whatsapp-explorer-server folder)
2. Start the Next.js app: `npm run dev` (in RENTAL_AGENT_AI folder)
3. Navigate to `/dashboard/whatsapp-explorer`
4. Enter the server URL and API key
5. Create/select a session and connect

## Differences from Incident-Dispatch Server

- **Port**: 3002 (vs 3001)
- **Service Type**: "explorer" (vs "incident-dispatch")
- **Session Filtering**: Accepts all sessions (vs only primary sessions)
- **Functionality**: No incident/RFQ integration, only AI auto-response

## License

MIT

