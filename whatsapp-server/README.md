# WhatsApp Baileys Server

A standalone Express.js server for WhatsApp integration using the [Baileys](https://github.com/WhiskeySockets/Baileys) library. This server provides a REST API for connecting to WhatsApp, sending/receiving messages, and configuring AI-powered auto-responses.

## Features

- QR code-based WhatsApp connection
- Send and receive text messages
- Message history storage in PostgreSQL
- AI-powered auto-responses using OpenAI
- Session persistence (reconnect without re-scanning QR)
- REST API for integration with other applications

## Prerequisites

- Node.js 17+
- PostgreSQL database (shared with PropNxt.AI)
- The database schema must include `whatsapp_sessions` and `whatsapp_explorer_messages` tables

## Installation

```bash
cd whatsapp-server
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
WHATSAPP_SERVER_PORT=3001
WHATSAPP_SERVER_API_KEY=your-secure-api-key-here

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

### Health Check
```
GET /health
```
Returns server health status. No authentication required.

### Session Management

All session endpoints require the `x-api-key` header.

#### Get Session Status
```
GET /sessions/:sessionId/status
```
Returns connection status, QR code (if pending), and phone number.

#### Connect Session
```
POST /sessions/:sessionId/connect
```
Initiates WhatsApp connection. Check status for QR code.

#### Disconnect Session
```
POST /sessions/:sessionId/disconnect
```
Disconnects the session but preserves auth state.

#### Logout Session
```
POST /sessions/:sessionId/logout
```
Logs out and clears auth state. Requires new QR scan.

### Messages

#### Get Messages
```
GET /sessions/:sessionId/messages?limit=50&offset=0
```
Returns message history for the session.

#### Send Message
```
POST /sessions/:sessionId/messages
Content-Type: application/json

{
  "recipient": "+27821234567",
  "content": "Hello from Baileys!"
}
```

### AI Configuration

#### Get AI Config
```
GET /sessions/:sessionId/ai-config
```

#### Update AI Config
```
PUT /sessions/:sessionId/ai-config
Content-Type: application/json

{
  "enabled": true,
  "systemPrompt": "You are a helpful assistant...",
  "model": "gpt-4",
  "openaiApiKey": "sk-..."
}
```

#### Test AI Response
```
POST /sessions/:sessionId/test-ai
Content-Type: application/json

{
  "testMessage": "Hello!",
  "systemPrompt": "You are a helpful assistant...",
  "model": "gpt-4",
  "openaiApiKey": "sk-..."
}
```

## Usage with Next.js App

The Next.js app (PropNxt.AI) includes a WhatsApp Explorer page that connects to this server:

1. Start this server: `npm run dev`
2. Start the Next.js app: `npm run dev` (in RENTAL_AGENT_AI folder)
3. Navigate to `/dashboard/whatsapp-explorer`
4. Enter the server URL and API key
5. Create/select a session and connect

## Project Structure

```
src/
├── index.ts                 # Express server entry point
├── config/
│   └── env.ts              # Environment configuration
├── baileys/
│   ├── auth-state.ts       # PostgreSQL auth state
│   ├── types.ts            # Type definitions
│   ├── connection-manager.ts # Session management
│   └── message-handler.ts   # Message processing
├── routes/
│   ├── index.ts            # Route aggregator
│   ├── sessions.ts         # Session endpoints
│   ├── messages.ts         # Message endpoints
│   └── ai.ts               # AI configuration endpoints
├── services/
│   └── ai-responder.ts     # OpenAI integration
├── middleware/
│   ├── auth.ts             # API key authentication
│   └── error-handler.ts    # Error handling
└── utils/
    └── logger.ts           # Pino logger
```

## Important Notes

- This server is intended for exploration and testing
- WhatsApp may ban accounts used for spam or automation abuse
- Keep the server running to maintain the WhatsApp connection
- Session auth is stored in PostgreSQL and persists across restarts

## Troubleshooting

### QR Code Not Showing
- Ensure the database connection is working
- Check that the session ID exists in `whatsapp_sessions` table
- Look at server logs for errors

### Connection Drops
- The server will automatically attempt to reconnect
- If logged out, you'll need to scan a new QR code

### Messages Not Saving
- Verify the `whatsapp_explorer_messages` table exists
- Check database permissions

## License

MIT
