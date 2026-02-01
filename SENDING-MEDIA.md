# Sending Media via WhatsApp Bridge

The bridge now supports sending **images, videos, audio, and documents** through WhatsApp!

## Message Format

### Text Only
```json
{
  "to": "+491234567890",
  "body": "Your message text"
}
```

### Media with Caption
```json
{
  "to": "+491234567890",
  "body": "Check this out!",
  "media": {
    "data": "<base64-encoded-file>",
    "mimetype": "image/jpeg",
    "filename": "photo.jpg"
  }
}
```

### Media without Caption
```json
{
  "to": "+491234567890",
  "media": {
    "data": "<base64-encoded-file>",
    "mimetype": "video/mp4",
    "filename": "video.mp4"
  }
}
```

## Supported Media Types

- **Images:** `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- **Videos:** `video/mp4`, `video/3gpp`
- **Audio:** `audio/mpeg`, `audio/ogg`, `audio/wav`
- **Documents:** `application/pdf`, `text/plain`, etc.

## How to Send Media

### From n8n Workflow

1. **Read file** using "Read Binary File" node
2. **Convert to base64** (already in binary.data)
3. **Queue message** with media object:

```javascript
// In n8n Code node
const fileData = $binary.data.data; // base64
const mimeType = $binary.data.mimeType;
const fileName = $binary.data.fileName;

return {
  json: {
    to: "+491234567890",
    body: "Here's your file!",
    media: {
      data: fileData,
      mimetype: mimeType,
      filename: fileName
    }
  }
};
```

4. **Send to queue** via HTTP Request to `https://flow.advery.one/webhook/whatsapp-queue`

### Via curl

```bash
# Encode file to base64
BASE64_DATA=$(base64 -w 0 image.jpg)

# Send request
curl -X POST https://flow.advery.one/webhook/whatsapp-queue \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"+491234567890\",
    \"body\": \"Check this image!\",
    \"media\": {
      \"data\": \"$BASE64_DATA\",
      \"mimetype\": \"image/jpeg\",
      \"filename\": \"image.jpg\"
    }
  }"
```

### From Python

```python
import requests
import base64

# Read and encode file
with open('photo.jpg', 'rb') as f:
    file_data = base64.b64encode(f.read()).decode('utf-8')

# Send message
response = requests.post(
    'https://flow.advery.one/webhook/whatsapp-queue',
    json={
        'to': '+491234567890',
        'body': 'Check this out!',
        'media': {
            'data': file_data,
            'mimetype': 'image/jpeg',
            'filename': 'photo.jpg'
        }
    }
)

print(response.json())
```

## Size Limits

WhatsApp has media size limits:
- **Images:** ~16 MB
- **Videos:** ~16 MB
- **Audio:** ~16 MB
- **Documents:** ~100 MB

Keep files within these limits to avoid send failures.

## Examples

### Send Photo with Caption
```json
{
  "to": "+491234567890",
  "body": "🌅 Sunset from yesterday!",
  "media": {
    "data": "/9j/4AAQSkZJRgABAQEA...",
    "mimetype": "image/jpeg",
    "filename": "sunset.jpg"
  }
}
```

### Send Voice Note
```json
{
  "to": "+491234567890",
  "media": {
    "data": "SUQzBAAAAAAAI1RTU0UAAAA...",
    "mimetype": "audio/ogg",
    "filename": "voice.ogg"
  }
}
```

### Send PDF Document
```json
{
  "to": "+491234567890",
  "body": "Here's the report you requested",
  "media": {
    "data": "JVBERi0xLjQKJeLjz9M...",
    "mimetype": "application/pdf",
    "filename": "report.pdf"
  }
}
```

## Troubleshooting

**Media not sending?**
- Check base64 encoding is correct
- Verify mimetype matches file type
- Ensure file size is within WhatsApp limits
- Check bridge logs: `tail -f ~/whatsapp-bridge/bridge.log`

**"Failed to send message" error?**
- Invalid phone number format
- WhatsApp account not ready
- Network issues
- File too large

## Testing

Restart the bridge to apply media support:
```bash
pkill -9 node chrome
cd ~/whatsapp-bridge
nohup node index.js > bridge.log 2>&1 &
```

Then test with a simple image:
```bash
# Create test image (1x1 red pixel)
echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==" > /tmp/test.b64

curl -X POST https://flow.advery.one/webhook/whatsapp-queue \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"+YOUR_NUMBER\",
    \"body\": \"Test image\",
    \"media\": {
      \"data\": \"$(cat /tmp/test.b64)\",
      \"mimetype\": \"image/png\",
      \"filename\": \"test.png\"
    }
  }"
```

Check the bridge logs - you should see:
```
📤 1 outgoing message(s) to send
✅ Sent media to +YOUR_NUMBER: test.png
```
