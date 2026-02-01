# WhatsApp Bridge Changes - 2026-01-31

## Problem
The original implementation sent each WhatsApp message individually to n8n, and text messages were being converted to `.txt` file attachments. This made it difficult to:
- Maintain message order
- Associate captions with media
- Process messages in batches

## Solution
**Message Batching:** Messages from the same sender are now batched together with a 3-second window. After 3 seconds of inactivity from a sender, all their messages are sent as one multipart/form-data request.

## New Data Structure

### Form Fields (metadata)
```
senderno: "+49 1578 3160603"
contactName: "Alex - WalkeeTalkee.app 🤘🏼"
chatName: "Alex - WalkeeTalkee.app 🤘🏼"
isGroup: "false"
messageCount: "3"
messages: [JSON array - see below]
```

### Messages JSON Array
```json
[
  {
    "messageId": "3EB0123456789",
    "timestamp": 1738349000,
    "type": "text",
    "body": "Wtf?"
  },
  {
    "messageId": "3EB0987654321",
    "timestamp": 1738349001,
    "type": "media",
    "body": "Check this out!",  // caption (optional)
    "mediaType": "video",
    "mimeType": "video/mp4",
    "mediaKey": "file0"  // reference to binary attachment
  },
  {
    "messageId": "3EB0555555555",
    "timestamp": 1738349002,
    "type": "text",
    "body": "Keine Ahnung was das ist"
  }
]
```

### Binary Attachments
- `file0`: video/mp4 (referenced by mediaKey)
- `file1`: image/jpeg
- etc.

## Benefits
1. **Message order preserved** - All messages in the array maintain chronological order
2. **Captions stay with media** - Caption text is in the same message object as the media reference
3. **Better structure** - Text is JSON, not binary files
4. **Efficient** - One HTTP request per batch instead of one per message
5. **Context** - n8n receives all related messages together

## Migration

### Old Scenario (file_2...json)
- Expected individual messages
- Text messages as `.txt` files
- No batching

### New Scenario (04-pocketmoney-improved.json)
- Processes batched messages
- Parses JSON messages array
- Better email formatting with timestamps
- Cleaner file handling

## Testing
Send multiple messages (text + media) within 3 seconds - they'll arrive as one batch.

## Rollback
If needed, revert to the old `index.js` from git history. The webhook URL and auth remain the same.
