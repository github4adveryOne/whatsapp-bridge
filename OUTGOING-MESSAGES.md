# WhatsApp Outgoing Messages - Complete Setup

## Overview
This system allows n8n workflows to send WhatsApp messages via the bridge using a simple queue-and-poll architecture.

## Architecture

```
n8n Workflow → Queue Endpoint → File Queue → Poll Endpoint → Bridge → WhatsApp
```

## Workflows

### 1. Queue Endpoint (06-outgoing-queue.json)
**URL:** `https://flow.advery.one/webhook/whatsapp-queue`  
**Method:** POST  
**Purpose:** Accepts messages to be sent via WhatsApp

**Request body:**
```json
{
  "to": "+491234567890",
  "body": "Your message text here"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg-1738358400-abc123",
  "queuedAt": "2026-01-31T20:00:00.000Z",
  "queueLength": 1
}
```

### 2. Poll Endpoint (07-outgoing-poll.json)
**URL:** `https://flow.advery.one/webhook/26e44e86-fe88-46e0-b06a-63d8b290ce68`  
**Method:** GET  
**Purpose:** Returns queued messages to the bridge (called every 5 seconds)

**Response:**
```json
{
  "messages": [
    {
      "to": "491234567890@c.us",
      "body": "Message text",
      "id": "msg-1738358400-abc123"
    }
  ]
}
```

Returns empty array when no messages pending:
```json
{
  "messages": []
}
```

### 3. Test/Send Helper (08-send-whatsapp-test.json)
**URL:** `https://flow.advery.one/webhook/whatsapp-send-test`  
**Method:** POST  
**Purpose:** Easy test endpoint for sending WhatsApp messages

**Request:**
```json
{
  "to": "+491234567890",
  "message": "Test message"
}
```

## Setup Instructions

### 1. Import Workflows into n8n
1. Open n8n at `https://flow.advery.one`
2. Go to Workflows → Import from File
3. Import these three files:
   - `06-outgoing-queue.json`
   - `07-outgoing-poll.json`
   - `08-send-whatsapp-test.json`
4. Activate all three workflows

### 2. Test the System

**Option A: Using curl**
```bash
curl -X POST https://flow.advery.one/webhook/whatsapp-queue \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+491234567890",
    "body": "Hello from n8n!"
  }'
```

**Option B: Using the test webhook**
```bash
curl -X POST https://flow.advery.one/webhook/whatsapp-send-test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+491234567890",
    "message": "Hello from test!"
  }'
```

**Option C: From another n8n workflow**
Use the HTTP Request node:
- Method: POST
- URL: `https://flow.advery.one/webhook/whatsapp-queue`
- Body (JSON):
  ```json
  {
    "to": "{{ $json.phoneNumber }}",
    "body": "{{ $json.messageText }}"
  }
  ```

### 3. Monitor the Bridge
Watch the bridge logs to see messages being sent:
```bash
tail -f /home/openclaw/whatsapp-bridge/bridge.log
```

You should see:
```
📤 1 outgoing message(s) to send
✅ Sent to +491234567890: Hello from n8n!
```

## Queue File Location
Messages are stored temporarily in:
- `/tmp/whatsapp-queue.json`

The bridge polls every 5 seconds, picks up messages, and clears the queue.

## Phone Number Format
The queue endpoint accepts multiple formats:
- `+491234567890` (with country code)
- `491234567890` (without +)
- `+49 1234 567890` (with spaces)

They're all normalized to `491234567890@c.us` for WhatsApp.

## Error Handling
- If a message fails to send, the bridge logs the error
- The queue clears after returning messages (no retry mechanism in this simple version)
- For production: consider adding a retry queue or database storage

## Integration Examples

### Example 1: Auto-reply to Email
Add an HTTP Request node to your email workflow:
```
Email Trigger → Process → Queue WhatsApp Message
```

### Example 2: Send from Pocketmoney Workflow
After processing expense messages, send a confirmation:
```json
{
  "to": "+491234567890",
  "body": "✅ Ausgabe von €15.50 wurde erfasst!"
}
```

### Example 3: Scheduled Reminder
Use n8n's Schedule Trigger + HTTP Request to send daily reminders.

## Troubleshooting

**Messages not sending?**
1. Check bridge is running: `ps aux | grep "node index"`
2. Check logs: `tail -f /home/openclaw/whatsapp-bridge/bridge.log`
3. Verify poll endpoint is active in n8n
4. Check queue file: `cat /tmp/whatsapp-queue.json`

**Bridge shows polling errors?**
- Make sure workflow 07 (poll endpoint) is activated in n8n
- Check the webhook URL matches: `26e44e86-fe88-46e0-b06a-63d8b290ce68`

**Queue fills up but nothing sends?**
- Bridge might be disconnected from WhatsApp
- Check for authentication errors in logs
- Restart bridge if needed
