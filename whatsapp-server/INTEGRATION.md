# WhatsApp Baileys Integration Architecture

This document describes the architecture and integration patterns for the WhatsApp Baileys server and its integration with the Rental Agent AI Next.js application.

## System Architecture

```mermaid
graph TB
    subgraph "Next.js App (Port 3000)"
        UI[WhatsApp Explorer Page]
        Actions[Server Actions]
        Client[whatsapp-baileys-client.ts]
    end

    subgraph "Baileys Server (Port 3001)"
        Express[Express.js API]
        ConnMgr[Connection Manager]
        MsgHandler[Message Handler]
        AIResp[AI Responder]
    end

    subgraph "PostgreSQL Database"
        Sessions[(whatsapp_sessions)]
        Messages[(whatsapp_explorer_messages)]
    end

    subgraph "External Services"
        WhatsApp[WhatsApp Web]
        OpenAI[OpenAI API]
    end

    UI --> Actions
    Actions --> Client
    Client -->|REST API| Express
    Express --> ConnMgr
    ConnMgr --> MsgHandler
    MsgHandler --> AIResp
    ConnMgr -->|WebSocket| WhatsApp
    AIResp -->|Chat Completion| OpenAI
    ConnMgr --> Sessions
    MsgHandler --> Messages
```

## Connection Flow

```mermaid
sequenceDiagram
    participant User
    participant Explorer as Next.js Explorer
    participant API as Baileys Server
    participant WA as WhatsApp Web
    participant DB as PostgreSQL

    User->>Explorer: Click Connect
    Explorer->>API: POST /sessions/{id}/connect
    API->>DB: Update status: connecting
    API-->>Explorer: { status: "connecting" }

    API->>WA: Initialize Connection
    WA-->>API: QR Code Event
    API->>DB: Update status: qr_pending

    loop Polling (every 3 seconds)
        Explorer->>API: GET /sessions/{id}/status
        API-->>Explorer: { status: "qr_pending", qrCode: "data:..." }
        Explorer->>User: Display QR Code
    end

    User->>WA: Scan QR with Phone
    WA-->>API: Connection Success
    API->>DB: Update status: connected, save auth

    Explorer->>API: GET /sessions/{id}/status
    API-->>Explorer: { status: "connected", phoneNumber: "..." }
    Explorer->>User: Show Connected State
```

## Message Flow

```mermaid
sequenceDiagram
    participant User
    participant Explorer as Next.js Explorer
    participant API as Baileys Server
    participant WA as WhatsApp Web
    participant DB as PostgreSQL
    participant AI as OpenAI

    Note over Explorer,API: Sending a Message
    User->>Explorer: Enter recipient & message
    Explorer->>API: POST /sessions/{id}/messages
    API->>WA: sendMessage(jid, content)
    WA-->>API: Message sent confirmation
    API->>DB: Store message (fromMe: true)
    API-->>Explorer: { messageId, status: "sent" }
    Explorer->>User: Show success

    Note over WA,AI: Receiving a Message with AI
    WA->>API: messages.upsert event
    API->>DB: Store message (fromMe: false)

    alt AI Auto-Response Enabled
        API->>AI: Generate response
        AI-->>API: Response text
        API->>WA: Send AI response
        API->>DB: Store AI message
    end

    Note over Explorer,DB: Polling for Messages
    loop Every 5 seconds when connected
        Explorer->>API: GET /sessions/{id}/messages
        API->>DB: SELECT messages
        API-->>Explorer: { messages: [...] }
        Explorer->>User: Update message list
    end
```

## AI Response Flow

```mermaid
sequenceDiagram
    participant WA as WhatsApp
    participant Handler as Message Handler
    participant AI as AI Responder
    participant OpenAI as OpenAI API

    WA->>Handler: Incoming message
    Handler->>Handler: Store message in DB
    Handler->>AI: getConfig(sessionId)

    alt AI Enabled
        AI-->>Handler: { enabled: true, systemPrompt, model, apiKey }
        Handler->>AI: generateResponse(message, config)
        AI->>OpenAI: chat.completions.create()
        OpenAI-->>AI: { response }
        AI-->>Handler: Response text
        Handler->>WA: Send response message
        Handler->>Handler: Store response in DB
    else AI Disabled
        AI-->>Handler: { enabled: false }
        Handler->>Handler: No action
    end
```

## Session State Machine

```mermaid
stateDiagram-v2
    [*] --> disconnected: Session Created

    disconnected --> connecting: connect()
    connecting --> qr_pending: QR Generated
    qr_pending --> connecting: QR Expired
    qr_pending --> connected: QR Scanned
    connecting --> connected: Auth Restored

    connected --> connecting: Connection Lost
    connected --> disconnected: disconnect()
    connected --> logged_out: logout()

    logged_out --> connecting: connect()

    note right of connected
        Session active
        Can send/receive messages
    end note

    note right of logged_out
        Auth state cleared
        Requires new QR scan
    end note
```

## Database Schema

```mermaid
erDiagram
    whatsapp_sessions {
        uuid id PK
        uuid user_profile_id FK
        text session_name
        text phone_number
        enum connection_status
        jsonb auth_state
        boolean is_active
        timestamp last_connected_at
        timestamp last_disconnected_at
        timestamp created_at
        timestamp updated_at
    }

    whatsapp_explorer_messages {
        uuid id PK
        uuid session_id FK
        text message_id
        text remote_jid
        boolean from_me
        text message_type
        text content
        text media_url
        text status
        timestamp timestamp
        timestamp created_at
    }

    whatsapp_sessions ||--o{ whatsapp_explorer_messages : has
```

## Component Responsibilities

### Baileys Server Components

| Component | Responsibility |
|-----------|---------------|
| **Connection Manager** | Singleton managing all WhatsApp sessions, handles connect/disconnect, QR generation, reconnection logic |
| **Message Handler** | Processes incoming/outgoing messages, stores in database, triggers AI responses |
| **AI Responder** | Manages AI configuration per session, generates OpenAI responses |
| **Auth State** | Persists Baileys authentication credentials to PostgreSQL |

### Next.js Components

| Component | Responsibility |
|-----------|---------------|
| **whatsapp-baileys-client.ts** | HTTP client library for Baileys server API |
| **whatsapp-explorer-actions.ts** | Server actions that wrap client library calls |
| **whatsapp-explorer-console.tsx** | UI component with tabs for connection, messaging, AI config |

## Communication Patterns

### REST API
- All commands (connect, send, configure) use REST API
- Simple request/response model
- Error handling via HTTP status codes

### Polling
- QR code updates: 3-second intervals during connection
- Message updates: 5-second intervals when connected
- Status updates: Manual refresh or automatic during connection

### Future Enhancements
- Server-Sent Events (SSE) for real-time message streaming
- WebSocket for bidirectional communication
- Webhook callbacks for message events

## Security Considerations

1. **API Key Authentication**: All endpoints (except health) require valid API key
2. **CORS**: Restricted to Next.js app URL only
3. **Credential Storage**: Auth state stored in database, never exposed via API
4. **Input Validation**: Phone numbers and messages validated before processing
5. **Rate Limiting**: Consider adding for production use

## Deployment Considerations

```mermaid
graph LR
    subgraph "Development"
        Dev1[Next.js :3000]
        Dev2[Baileys :3001]
        Dev3[PostgreSQL :5432]
    end

    subgraph "Production"
        Prod1[Next.js on Vercel]
        Prod2[Baileys on VPS/Container]
        Prod3[Supabase PostgreSQL]
    end

    Dev1 --> Dev2
    Dev2 --> Dev3

    Prod1 --> Prod2
    Prod2 --> Prod3
```

### Production Requirements
- Baileys server needs persistent connection (not serverless)
- Consider using PM2 or Docker for process management
- Ensure database connection pooling is configured
- Set up monitoring for connection health
