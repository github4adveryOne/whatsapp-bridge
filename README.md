# WhatsApp Bridge for n8n

Standalone service that connects WhatsApp to n8n workflows.

## Architecture

**Incoming (WhatsApp → n8n):**
- WhatsApp message received → Posted to n8n webhook

**Outgoing (n8n → WhatsApp):**
- Service polls n8n endpoint every 5s
- Sends messages via WhatsApp

## Setup

### 1. Install dependencies
```bash
cd ~/whatsapp-bridge
npm install
```

### 2. Configure n8n URLs
```bash
cp .env.example .env
# Edit .env with your n8n webhook URLs
```

### 3. First run (manual - to scan QR code)
```bash
node index.js
```

Scan the QR code with your WhatsApp mobile app (Settings → Linked Devices).

### 4. Install as systemd service
```bash
sudo cp whatsapp-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-bridge
sudo systemctl start whatsapp-bridge
```

### 5. Check status
```bash
sudo systemctl status whatsapp-bridge
sudo journalctl -u whatsapp-bridge -f
```

## n8n Requirements

### Incoming Webhook (receives WhatsApp messages)
- **URL:** `https://flow.advery.one/webhook/whatsapp-incoming`
- **Method:** POST
- **Payload:**
```json
{
  "from": "1234567890@c.us",
  "to": "0987654321@c.us",
  "body": "message text",
  "timestamp": 1234567890,
  "isGroup": false,
  "chatName": "Contact Name",
  "contactName": "Sender Name",
  "hasMedia": false,
  "type": "chat"
}
```

### Outgoing Poll Endpoint (returns messages to send)
- **URL:** `https://flow.advery.one/webhook/whatsapp-outgoing-poll`
- **Method:** GET
- **Response:**
```json
{
  "messages": [
    {
      "to": "1234567890@c.us",
      "body": "Reply text",
      "id": "optional-message-id"
    }
  ]
}
```

If no messages, return:
```json
{
  "messages": []
}
```

## Phone Number Format

WhatsApp uses this format:
- Individual: `<country_code><number>@c.us` (e.g., `491234567890@c.us`)
- Group: `<group_id>@g.us`

The bridge auto-appends `@c.us` if missing.

## Commands

```bash
# Start manually
node index.js

# Start service
sudo systemctl start whatsapp-bridge

# Stop service
sudo systemctl stop whatsapp-bridge

# View logs
sudo journalctl -u whatsapp-bridge -f

# Restart service
sudo systemctl restart whatsapp-bridge
```

## Session Data

WhatsApp session is stored in `./whatsapp-session/`.

To logout and re-authenticate:
```bash
sudo systemctl stop whatsapp-bridge
rm -rf whatsapp-session/
node index.js  # Scan new QR code
```

## Environment Variables

- `N8N_INCOMING_WEBHOOK` - Webhook URL for incoming messages
- `N8N_OUTGOING_POLL` - Poll endpoint for outgoing messages
- `N8N_ACK_URL` - Optional acknowledgment endpoint
- `POLL_INTERVAL` - Polling interval in ms (default: 5000)
