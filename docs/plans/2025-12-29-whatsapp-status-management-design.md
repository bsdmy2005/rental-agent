# WhatsApp Server Status Management Design

## Overview

This design addresses the need for robust WhatsApp server status management, including:
- Server-side auto-reconnect on startup
- Front-end status visibility (green/red indicator)
- Hybrid polling for health monitoring
- Auto-recovery mechanisms

## Decisions Made

| Decision | Choice |
|----------|--------|
| Auto-recovery approach | Server-side auto-reconnect |
| Status indicator location | Both header (dot) and sidebar (detailed) |
| Polling strategy | Hybrid: light every 30s, deep every 5min |
| Status colors | Binary: green (working) / red (issue) with details on click |

---

## 1. Server-Side Auto-Reconnect

### On Server Startup

When the WhatsApp server starts, it will:

1. Query the database for all sessions where:
   - `session_name = 'primary'` (only primary sessions auto-connect)
   - `auth_state IS NOT NULL` (has saved credentials)
   - `is_active = true`
   - `auto_connect = true` (new column)

2. For each qualifying session, attempt connection with staggered delays (2 seconds between each) to avoid overwhelming WhatsApp's servers

3. Log results: connected, failed (will retry), or needs re-authentication

### Retry Logic

- If initial connection fails but auth state exists: retry up to 3 times with exponential backoff (5s, 15s, 45s)
- After 3 failures: mark session as `connection_status = 'disconnected'` with `last_error` populated
- Existing reconnect logic (on WebSocket close) remains unchanged

### Database Schema Change

```sql
ALTER TABLE whatsapp_sessions ADD COLUMN auto_connect BOOLEAN NOT NULL DEFAULT true;
```

### Graceful Shutdown Enhancement

Update shutdown handler to:
- Update all connected sessions to `disconnected` status in database
- Close sockets cleanly (already exists)
- This ensures database reflects reality after restart

---

## 2. Health Check API

### Lightweight Endpoint (No Auth - Every 30s)

```
GET /health
```

Response:
```typescript
{
  status: "ok" | "degraded" | "error",
  timestamp: string,
  uptime: number,  // seconds since server start
  sessions: {
    total: number,
    connected: number,
    connecting: number,
    disconnected: number
  }
}
```

### Deep Health Endpoint (Auth Required - Every 5min)

```
GET /health/deep
Headers: { "x-api-key": "..." }
```

Response:
```typescript
{
  status: "ok" | "degraded" | "error",
  timestamp: string,
  uptime: number,
  database: { connected: boolean, latencyMs: number },
  sessions: [
    {
      sessionId: string,
      phoneNumber: string | null,
      connectionStatus: string,
      lastConnectedAt: string | null,
      lastMessageAt: string | null,
      socketAlive: boolean
    }
  ]
}
```

### Status Derivation

- `ok`: All primary sessions connected, database healthy
- `degraded`: Server running but some sessions disconnected or reconnecting
- `error`: Database unreachable or critical failure

---

## 3. Front-End Status Context & Polling

### React Context Provider

Create `WhatsAppStatusProvider` that wraps the dashboard layout:

```typescript
interface WhatsAppStatusState {
  status: "connected" | "disconnected"  // binary for UI
  serverReachable: boolean
  connectionStatus: string  // detailed: connected, connecting, qr_pending, etc.
  phoneNumber: string | null
  lastChecked: Date
  lastError: string | null
  isChecking: boolean
}
```

### Polling Logic

- Light poll (`/health`) every 30 seconds using `setInterval`
- Deep poll (`/health/deep`) every 5 minutes
- Polls pause when browser tab is hidden (visibility API)
- Immediate poll on tab focus after being hidden
- Retry with backoff if server unreachable (5s, 10s, 30s, then stay at 30s)

### Server Actions

```typescript
// actions/whatsapp-health-actions.ts
export async function getWhatsAppHealthAction(): Promise<ActionState<HealthStatus>>
export async function getWhatsAppDeepHealthAction(): Promise<ActionState<DeepHealthStatus>>
```

### Hook for Components

```typescript
const { status, connectionStatus, lastError } = useWhatsAppStatus()
```

---

## 4. Status Indicator Components

### Header Indicator (Minimal Dot)

Location: Top header bar, right side

```tsx
<WhatsAppStatusDot />
```

- 8px circle, green or red
- Tooltip on hover: "WhatsApp: Connected" or "WhatsApp: Disconnected - Click for details"
- Click: Opens status popover
- Pulses briefly when status changes

### Sidebar Footer Indicator (Detailed)

Location: Bottom of sidebar, near user avatar section

```tsx
<WhatsAppStatusBadge />
```

Displays:
- Green: "WhatsApp Connected" (small text + dot)
- Red: "WhatsApp Offline" (small text + dot)

Click expands to show:
- Phone number (masked: +27 **** 1234)
- Detailed status
- Last connected time
- "Reconnect" button if disconnected
- "Settings" link

### Status Popover Content

When clicked (either location), shows:
- Current status with icon
- Phone number (if connected)
- Last successful connection time
- If red: Error message + "Try Reconnect" button
- Link to WhatsApp settings page

### Animation

- Smooth color transition on status change
- Brief pulse animation when status changes

---

## 5. Auto-Recovery Trigger

### Deep Health Check Recovery Actions

1. **Socket Dead but Status Shows Connected:**
   - `socketAlive: false` but `connectionStatus: "connected"` in database
   - Action: Call reconnect API for that session

2. **No Recent Messages (Staleness Check):**
   - `lastMessageAt` older than 30 minutes AND session should be active
   - Action: Send presence update to verify connection
   - If presence fails: trigger reconnect

3. **Server Just Restarted:**
   - `uptime` less than 60 seconds
   - Front-end shows "Reconnecting..." status briefly
   - Polls more frequently (every 5s) until stable

### Recovery API Endpoint

```
POST /sessions/:sessionId/reconnect
```

Response:
```typescript
{ success: boolean, message: string }
```

### Front-End Recovery Button

When status is red, the popover shows:
- "Try Reconnect" button
- Calls `reconnectPrimarySessionAction`
- Shows spinner while reconnecting
- Updates status on success/failure

### Rate Limiting

- Max 3 auto-recovery attempts per session per hour
- After 3 failures, require manual intervention
- Log all recovery attempts for debugging

---

## 6. Implementation Files

### Database Changes

- Add `auto_connect` boolean column to `whatsapp_sessions` table

### WhatsApp Server Changes

```
whatsapp-server/src/
├── index.ts                    # Add startup auto-connect logic
├── routes/
│   └── health.ts               # New: /health and /health/deep endpoints
└── baileys/
    └── connection-manager.ts   # Add reconnect method, socket health check
```

### Next.js App Changes

```
actions/
└── whatsapp-health-actions.ts  # New: health check actions

lib/
└── whatsapp/
    └── health-client.ts        # New: typed client for health endpoints

app/(authenticated)/dashboard/
├── _components/
│   ├── layout-client.tsx       # Wrap with WhatsAppStatusProvider
│   ├── whatsapp-status-dot.tsx       # New: header indicator
│   ├── whatsapp-status-badge.tsx     # New: sidebar indicator
│   └── whatsapp-status-popover.tsx   # New: detail popover
└── _context/
    └── whatsapp-status-context.tsx   # New: polling context

components/ui/app-sidebar.tsx   # Add WhatsAppStatusBadge to footer
```

### Key Dependencies

- No new packages required
- Uses existing polling patterns, Shadcn UI components

### Estimated Scope

- 8-10 new/modified files
- Server: ~200 lines new code
- Front-end: ~400 lines new code
