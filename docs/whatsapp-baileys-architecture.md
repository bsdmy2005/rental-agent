# WhatsApp Baileys Architecture Documentation

This document explains how the WhatsApp Baileys integration works, including authentication, message handling, and AI auto-response functionality.

## Overview

The WhatsApp integration uses a standalone Express.js server (Baileys server) that handles WhatsApp connections via the Baileys library. The Next.js frontend communicates with this server via REST API calls.

## System Architecture

```mermaid
graph TB
    subgraph Frontend["Next.js Frontend"]
        UI[WhatsApp Explorer UI]
        Actions[Server Actions]
        Client[Baileys Client Library]
    end
    
    subgraph Backend["Next.js Backend"]
        API[API Routes]
        DB[(PostgreSQL Database)]
    end
    
    subgraph External["External Services"]
        BaileysServer[Baileys Express Server]
        WhatsApp[WhatsApp Web]
        OpenAI[OpenAI API]
    end
    
    UI --> Actions
    Actions --> Client
    Client -->|HTTP REST API| BaileysServer
    BaileysServer <-->|WebSocket/QR| WhatsApp
    BaileysServer -->|AI Requests| OpenAI
    Actions --> DB
    BaileysServer -->|Store Messages| DB
```

## Authentication Flow

The authentication process uses QR code scanning to link a WhatsApp account:

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant NextJS as Next.js Backend
    participant BaileysServer as Baileys Express Server
    participant WhatsApp as WhatsApp Web
    
    User->>Frontend: Enter phone number & click Connect
    Frontend->>NextJS: connectSessionAction(sessionId)
    NextJS->>BaileysServer: POST /sessions/{sessionId}/connect
    BaileysServer->>WhatsApp: Initiate connection
    WhatsApp-->>BaileysServer: QR Code generated
    BaileysServer-->>NextJS: Status: qr_pending, qrCode
    NextJS-->>Frontend: Return QR code data URL
    Frontend->>Frontend: Display QR code
    User->>WhatsApp: Scan QR code with phone
    WhatsApp->>BaileysServer: Authentication successful
    BaileysServer->>BaileysServer: Store auth state
    BaileysServer-->>NextJS: Status: connected, phoneNumber
    NextJS-->>Frontend: Update status to connected
    Frontend->>Frontend: Show connected phone number
```

### Key Steps:

1. **Session Creation**: A WhatsApp session is created in the database for the user
2. **Connection Initiation**: Frontend calls the Baileys server to start connection
3. **QR Code Generation**: Baileys server generates a QR code for WhatsApp Web authentication
4. **QR Code Display**: Frontend polls for status and displays QR code when available
5. **QR Code Scanning**: User scans QR code with their WhatsApp mobile app
6. **Authentication**: WhatsApp Web authenticates and stores credentials in Baileys server
7. **Connection Complete**: Status updates to "connected" and phone number is stored

## Message Flow

Messages flow through the Baileys server which acts as a bridge between WhatsApp Web and the application:

```mermaid
sequenceDiagram
    participant Contact
    participant WhatsApp as WhatsApp Web
    participant BaileysServer as Baileys Express Server
    participant NextJS as Next.js Backend
    participant Frontend
    participant DB[(Database)]
    
    Note over Contact,DB: Incoming Message Flow
    Contact->>WhatsApp: Send message
    WhatsApp->>BaileysServer: Message received event
    BaileysServer->>BaileysServer: Process message
    BaileysServer->>DB: Store message in whatsapp_explorer_messages
    BaileysServer->>BaileysServer: Check AI config
    alt AI Enabled & In Whitelist
        BaileysServer->>OpenAI: Generate AI response
        OpenAI-->>BaileysServer: AI response
        BaileysServer->>WhatsApp: Send response message
        WhatsApp->>Contact: Deliver response
    end
    Frontend->>NextJS: Poll for messages (every 5s)
    NextJS->>BaileysServer: GET /sessions/{sessionId}/messages
    BaileysServer-->>NextJS: Return messages
    NextJS-->>Frontend: Display messages
    
    Note over Contact,DB: Outgoing Message Flow
    Frontend->>NextJS: sendMessageAction(recipient, content)
    NextJS->>BaileysServer: POST /sessions/{sessionId}/messages
    BaileysServer->>BaileysServer: Format recipient (27... format)
    BaileysServer->>WhatsApp: Send message via Baileys
    WhatsApp->>Contact: Deliver message
    BaileysServer->>DB: Store sent message
    BaileysServer-->>NextJS: Return message ID
    NextJS-->>Frontend: Confirm message sent
```

### Message Storage

- **Incoming Messages**: Stored in `whatsapp_explorer_messages` table with `fromMe: false`
- **Outgoing Messages**: Stored in `whatsapp_explorer_messages` table with `fromMe: true`
- **Message Format**: `remoteJid` contains phone number in format `27788307321@s.whatsapp.net`

## AI Auto-Response Flow

The AI auto-responder processes incoming messages and generates responses using OpenAI:

```mermaid
sequenceDiagram
    participant Contact
    participant BaileysServer as Baileys Express Server
    participant AIHandler as AI Message Handler
    participant OpenAI as OpenAI API
    participant Contact2 as Contact (Response)
    
    Contact->>BaileysServer: Incoming message
    BaileysServer->>AIHandler: Check if AI enabled
    alt AI Disabled
        AIHandler-->>BaileysServer: Skip processing
    else AI Enabled
        AIHandler->>AIHandler: Check phone whitelist
        alt Not in Whitelist
            AIHandler-->>BaileysServer: Skip processing
        else In Whitelist
            AIHandler->>AIHandler: Load AI config (systemPrompt, model)
            AIHandler->>OpenAI: Generate response
            Note over AIHandler,OpenAI: Request includes:<br/>- System prompt<br/>- User message<br/>- Model (gpt-4)
            OpenAI-->>AIHandler: AI response text
            AIHandler->>BaileysServer: Send response message
            BaileysServer->>Contact2: Deliver AI response
        end
    end
```

### AI Configuration

- **Storage**: AI config stored in Baileys server (not in database)
- **Configuration**: Set via `updateAiConfig` API endpoint
- **Parameters**:
  - `enabled`: Boolean to enable/disable auto-response
  - `systemPrompt`: Custom prompt for AI behavior
  - `model`: OpenAI model (from `OPENAI_MODEL` env var)
  - `openaiApiKey`: API key (from `OPENAI_API_KEY` env var)
  - `allowedPhoneNumbers`: Whitelist of phone numbers (optional)

### AI Response Process

1. **Message Received**: Baileys server receives incoming message
2. **AI Check**: Server checks if AI is enabled for the session
3. **Whitelist Check**: If whitelist exists, verify sender is in whitelist
4. **AI Request**: Send message + system prompt to OpenAI
5. **Response Generation**: OpenAI generates response based on system prompt
6. **Message Send**: Baileys server sends AI response back to sender

## Component Interactions

```mermaid
graph LR
    subgraph FrontendComponents["Frontend Components"]
        ExplorerConsole[WhatsApp Explorer Console]
        ContactsManager[Contacts Manager]
        MessageThreads[Message Threads]
        ThreadMessages[Thread Messages]
    end
    
    subgraph Actions["Server Actions"]
        SessionActions[Session Actions]
        MessageActions[Message Actions]
        ContactActions[Contact Actions]
        AIConfigActions[AI Config Actions]
    end
    
    subgraph ClientLib["Client Library"]
        BaileysClient[WhatsApp Baileys Client]
    end
    
    subgraph BaileysServer["Baileys Express Server"]
        SessionAPI[Session API]
        MessageAPI[Message API]
        AIConfigAPI[AI Config API]
    end
    
    ExplorerConsole --> SessionActions
    ExplorerConsole --> MessageActions
    ContactsManager --> ContactActions
    MessageThreads --> MessageActions
    ThreadMessages --> MessageActions
    
    SessionActions --> BaileysClient
    MessageActions --> BaileysClient
    AIConfigActions --> BaileysClient
    
    BaileysClient --> SessionAPI
    BaileysClient --> MessageAPI
    BaileysClient --> AIConfigAPI
```

## Database Schema

### WhatsApp Sessions

```mermaid
erDiagram
    whatsapp_sessions {
        uuid id PK
        uuid user_profile_id FK
        text session_name
        text phone_number
        enum connection_status
        timestamp last_connected_at
        timestamp last_disconnected_at
        jsonb auth_state
        boolean is_active
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
    
    whatsapp_contacts {
        uuid id PK
        uuid session_id FK
        text phone_number
        text display_name
        text notes
        boolean is_favorite
        timestamp created_at
        timestamp updated_at
    }
    
    user_profiles {
        uuid id PK
        text clerk_user_id
        enum user_type
    }
    
    whatsapp_sessions ||--o{ whatsapp_explorer_messages : "has"
    whatsapp_sessions ||--o{ whatsapp_contacts : "has"
    user_profiles ||--o{ whatsapp_sessions : "owns"
```

## Key Concepts

### Session Management

- Each user has one or more WhatsApp sessions
- Sessions are identified by `sessionId` (UUID)
- Sessions store authentication state in `authState` JSONB field
- Phone number is stored after successful connection

### Message Threading

- Messages are grouped by `remoteJid` (contact's phone number)
- Each unique `remoteJid` represents a conversation thread
- Threads can be associated with saved contacts for better organization

### Phone Number Format

- **Storage Format**: `27...` (country code without +)
- **WhatsApp Format**: `27788307321@s.whatsapp.net` (remoteJid)
- **Display Format**: Can show as `0821234567` or `+27821234567`
- **Normalization**: Input formats are converted to `27...` format

### AI Auto-Response

- **Configuration**: Per-session basis
- **Whitelist**: Optional list of allowed phone numbers
- **Environment Variables**: 
  - `OPENAI_API_KEY`: Required for AI functionality
  - `OPENAI_MODEL`: Model to use (defaults to `gpt-4`)
- **System Prompt**: Customizable per session

## API Endpoints (Baileys Server)

### Session Management
- `GET /sessions/{sessionId}/status` - Get session status and QR code
- `POST /sessions/{sessionId}/connect` - Initiate connection
- `POST /sessions/{sessionId}/disconnect` - Disconnect session
- `POST /sessions/{sessionId}/logout` - Logout and clear auth

### Messages
- `GET /sessions/{sessionId}/messages` - Get messages (with pagination)
- `POST /sessions/{sessionId}/messages` - Send a message

### AI Configuration
- `GET /sessions/{sessionId}/ai-config` - Get AI configuration
- `PUT /sessions/{sessionId}/ai-config` - Update AI configuration
- `POST /sessions/{sessionId}/test-ai` - Test AI response

## Error Handling

- **Connection Errors**: Displayed in UI with error messages
- **Message Send Failures**: Logged and returned to frontend
- **AI Errors**: Caught and logged, don't block message storage
- **Network Errors**: Retry logic in Baileys server

## Security Considerations

- **API Key**: Required for all Baileys server requests
- **Session Isolation**: Each user's sessions are isolated by `userProfileId`
- **Auth State**: Stored securely in database (encrypted by Baileys)
- **Phone Number Privacy**: Phone numbers normalized and stored securely

