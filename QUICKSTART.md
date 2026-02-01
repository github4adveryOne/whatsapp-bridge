# Quick Start Guide

## 1. First Time Setup

```bash
cd ~/whatsapp-bridge

# Copy and configure environment
cp .env.example .env
nano .env  # Set your n8n URLs

# Start manually to scan QR code
node index.js
```

You'll see a QR code. Scan it with WhatsApp (Settings → Linked Devices).

Once connected, press Ctrl+C.

## 2. Import n8n Workflows

Go to your n8n instance: https://flow.advery.one

### Import workflows:
1. Click "+" → "Import from File"
2. Import `n8n-workflows/01-incoming-receiver.json`
3. Import `n8n-workflows/02-outgoing-poll.json`
4. Activate both workflows

### Note the webhook URLs:
- Incoming: `https://flow.advery.one/webhook/whatsapp-incoming`
- Outgoing: `https://flow.advery.one/webhook/whatsapp-outgoing-poll`

Make sure these match your `.env` file!

## 3. Install as Service

```bash
sudo cp whatsapp-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-bridge
sudo systemctl start whatsapp-bridge
```

## 4. Test It

### Send a WhatsApp message to your number
Check n8n execution logs - you should see the incoming message!

### Send a message back (test the poll endpoint)
Edit the n8n outgoing workflow and uncomment the test message:

```javascript
const pendingMessages = [
  {
    to: "YOUR_NUMBER",  // Format: 491234567890
    body: "Test from n8n!",
    id: "msg-" + Date.now()
  }
];
```

Within 5 seconds, you should receive the message on WhatsApp!

## 5. Monitor

```bash
# View live logs
sudo journalctl -u whatsapp-bridge -f

# Check status
sudo systemctl status whatsapp-bridge
```

## Troubleshooting

### QR Code won't scan
```bash
sudo systemctl stop whatsapp-bridge
rm -rf whatsapp-session/
node index.js  # Scan fresh QR code
```

### Messages not arriving in n8n
- Check n8n webhook is active (green light)
- Check n8n execution history for errors
- Verify URL in `.env` matches n8n webhook URL

### Messages not sending
- Check n8n poll endpoint returns proper JSON format
- View logs: `sudo journalctl -u whatsapp-bridge -f`
- Verify phone number format (e.g., `491234567890`)

## Next Steps

Now you can:
1. Connect the incoming webhook to AI/processing logic
2. Build a proper message queue (database/Redis)
3. Add response automation
4. Integrate with other systems

Happy automating! 🚀
