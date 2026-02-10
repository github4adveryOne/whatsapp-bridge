require('dotenv').config();
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const axios = require('axios');

// Configuration
const config = {
  n8n: {
    incomingWebhook: process.env.N8N_INCOMING_WEBHOOK || 'https://flow.advery.one/webhook/whatsapp-incoming',
    outgoingPollUrl: process.env.N8N_OUTGOING_POLL || 'https://flow.advery.one/webhook/whatsapp-outgoing-poll',
    pollInterval: parseInt(process.env.POLL_INTERVAL || '5000'), // 5 seconds
    auth: process.env.N8N_WEBHOOK_USER && process.env.N8N_WEBHOOK_PASS ? {
      username: process.env.N8N_WEBHOOK_USER,
      password: process.env.N8N_WEBHOOK_PASS
    } : null
  }
};

console.log('🚀 WhatsApp Bridge starting...');
console.log('📋 Config:', JSON.stringify(config, null, 2));

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './whatsapp-session'
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// QR Code for authentication
client.on('qr', (qr) => {
  console.log('📱 Scan this QR code with WhatsApp:');
  qrcode.generate(qr, { small: true });
  
  // Also save as image file
  QRCode.toFile('whatsapp-qr.png', qr, {
    width: 800,
    margin: 2
  }, (err) => {
    if (err) {
      console.error('❌ Failed to save QR image:', err.message);
    } else {
      console.log('💾 QR code saved to: whatsapp-qr.png');
    }
  });
});

// Ready event
client.on('ready', () => {
  console.log('✅ WhatsApp connected and ready!');
  startOutgoingPoller();
});

// Authentication
client.on('authenticated', () => {
  console.log('🔐 Authenticated successfully');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg);
});

// Message batching: group messages by sender for 3 seconds
const messageBatches = new Map(); // sender -> { messages: [], timeout: Timer }

// Incoming message handler
client.on('message', async (message) => {
  try {
    const chat = await message.getChat();
    const contact = await message.getContact();
    
    const sender = message.from;
    
    // Prepare message data
    const messageData = {
      timestamp: message.timestamp,
      messageId: message.id.id,
      body: message.body || '',
      type: message.type,
      hasMedia: message.hasMedia,
      contactName: contact.pushname || contact.name,
      chatName: chat.name,
      isGroup: chat.isGroup
    };

    // Download media if present
    if (message.hasMedia) {
      try {
        const media = await message.downloadMedia();
        messageData.media = {
          mimetype: media.mimetype,
          data: media.data, // base64
          filename: media.filename || `media_${Date.now()}`
        };
      } catch (mediaError) {
        console.error('❌ Failed to download media:', mediaError.message);
        messageData.mediaError = mediaError.message;
      }
    }

    console.log('📨 Incoming:', messageData.contactName, ':', 
                messageData.body.substring(0, 50) || `[${messageData.type}]`);

    // Add to batch
    if (!messageBatches.has(sender)) {
      messageBatches.set(sender, { 
        messages: [],
        contactName: messageData.contactName,
        chatName: messageData.chatName,
        isGroup: messageData.isGroup,
        timeout: null 
      });
    }

    const batch = messageBatches.get(sender);
    batch.messages.push(messageData);

    // Clear existing timeout
    if (batch.timeout) {
      clearTimeout(batch.timeout);
    }

    // Set new timeout: send batch after 3 seconds of inactivity
    batch.timeout = setTimeout(() => {
      sendBatchToN8n(sender, batch);
      messageBatches.delete(sender);
    }, 3000);

  } catch (error) {
    console.error('❌ Error handling incoming message:', error.message);
  }
});

// Send batched messages to n8n
async function sendBatchToN8n(sender, batch) {
  try {
    const FormData = require('form-data');
    const form = new FormData();

    // Extract phone number (remove @c.us suffix)
    const phoneNumber = sender.replace('@c.us', '');
    
    // Prepare structured data with media file indices
    let mediaFileIndex = 0;
    const messagesPayload = batch.messages.map((msg) => {
      const msgData = {
        messageId: msg.messageId,
        timestamp: msg.timestamp,
        timestampDate: new Date(msg.timestamp * 1000).toISOString(),
        type: msg.hasMedia ? 'media' : 'text',
        body: msg.body
      };

      if (msg.hasMedia && msg.media) {
        msgData.mediaType = msg.media.mimetype.split('/')[0]; // image, video, audio, etc.
        msgData.mimeType = msg.media.mimetype;
        msgData.mediaFileName = msg.media.filename;
        msgData.fileIndex = mediaFileIndex; // Clear index to match binary attachment
        msgData.fileKey = `file${mediaFileIndex}`; // e.g., "file0", "file1"
        mediaFileIndex++;
      }

      return msgData;
    });

    // Add JSON metadata
    form.append('senderno', phoneNumber);
    form.append('contactName', batch.contactName);
    form.append('chatName', batch.chatName);
    form.append('isGroup', String(batch.isGroup));
    form.append('messageCount', String(batch.messages.length));
    form.append('messages', JSON.stringify(messagesPayload));

    // Add media files (using same index as in messagesPayload)
    let fileIdx = 0;
    batch.messages.forEach((msg) => {
      if (msg.hasMedia && msg.media) {
        const buffer = Buffer.from(msg.media.data, 'base64');
        const filename = msg.media.filename || `media_${fileIdx}`;
        form.append(`file${fileIdx}`, buffer, {
          filename: filename,
          contentType: msg.media.mimetype
        });
        fileIdx++;
      }
    });

    // Send to n8n
    const url = config.n8n.incomingWebhook;
    const headers = form.getHeaders();
    
    if (config.n8n.auth) {
      const authString = Buffer.from(
        `${config.n8n.auth.username}:${config.n8n.auth.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${authString}`;
    }

    await axios.post(url, form, { headers });
    
    console.log(`✅ Sent batch to n8n: ${batch.messages.length} message(s) from ${phoneNumber}`);
  } catch (error) {
    console.error('❌ Error sending batch to n8n:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', JSON.stringify(error.response.data));
    }
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    console.error('   Full error:', error.stack || error);
  }
}

// Outgoing message poller
let pollerTimeout = null;
let isPolling = false;

function startOutgoingPoller() {
  console.log(`🔄 Starting outgoing message poller (${config.n8n.pollInterval}ms interval)`);
  scheduleNextPoll();
}

async function pollOutgoingMessages() {
  if (isPolling) {
    console.warn('⚠️ Previous poll still running, skipping this cycle');
    return;
  }

  isPolling = true;
  
  try {
    const response = await axios.get(config.n8n.outgoingPollUrl);
    const messages = response.data.messages || [];

    if (messages.length > 0) {
      console.log(`📤 ${messages.length} outgoing message(s) to send`);
    }

    for (const msg of messages) {
      try {
        // Format WhatsApp number (ensure it has @c.us suffix)
        const chatId = msg.to.includes('@c.us') ? msg.to : `${msg.to}@c.us`;
        
        // Check if message has media
        if (msg.media) {
          // Send media message
          // msg.media should contain: { data: <base64>, mimetype: <mime>, filename: <name> }
          const media = new MessageMedia(
            msg.media.mimetype,
            msg.media.data,
            msg.media.filename
          );
          
          const options = {};
          if (msg.body) {
            options.caption = msg.body;
          }
          
          await client.sendMessage(chatId, media, options);
          console.log(`✅ Sent media to ${msg.to}: ${msg.media.filename || 'file'}`);
        } else {
          // Send text message
          await client.sendMessage(chatId, msg.body);
          console.log(`✅ Sent to ${msg.to}: ${msg.body.substring(0, 50)}`);
        }

        // Acknowledge delivery to n8n (if msg has an ID)
        if (msg.id && config.n8n.ackUrl) {
          await axios.post(config.n8n.ackUrl, { id: msg.id });
        }
      } catch (sendError) {
        console.error(`❌ Failed to send message to ${msg.to}:`, sendError.message);
      }
    }
  } catch (error) {
    // Don't log errors if n8n endpoint doesn't exist yet (404/502)
    if (error.response && [404, 502].includes(error.response.status)) {
      // Silent - endpoint not ready yet
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      // Network issues - silent
    } else {
      console.error('❌ Polling error:', error.message);
    }
  } finally {
    isPolling = false;
    scheduleNextPoll();
  }
}

function scheduleNextPoll() {
  pollerTimeout = setTimeout(pollOutgoingMessages, config.n8n.pollInterval);
}

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  if (pollerTimeout) clearTimeout(pollerTimeout);
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 SIGTERM received, shutting down...');
  if (pollerTimeout) clearTimeout(pollerTimeout);
  client.destroy();
  process.exit(0);
});

// Prevent crashes from unhandled errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  console.error(error.stack);
  // Don't exit - keep running
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  // Don't exit - keep running
});

// Start the client
client.initialize();
