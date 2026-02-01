#!/usr/bin/env node

const axios = require('axios');

const config = {
  incomingWebhook: process.env.N8N_INCOMING_WEBHOOK || 'https://flow.advery.one/webhook/whatsapp-incoming',
  outgoingPoll: process.env.N8N_OUTGOING_POLL || 'https://flow.advery.one/webhook/whatsapp-outgoing-poll'
};

console.log('🧪 Testing WhatsApp Bridge Configuration\n');

async function testIncomingWebhook() {
  console.log('Testing incoming webhook:', config.incomingWebhook);
  try {
    const testPayload = {
      from: "1234567890@c.us",
      to: "0987654321@c.us",
      body: "Test message",
      timestamp: Date.now(),
      isGroup: false,
      chatName: "Test Contact",
      contactName: "Test User",
      hasMedia: false,
      type: "chat"
    };

    const response = await axios.post(config.incomingWebhook, testPayload, {
      timeout: 5000
    });
    
    console.log('✅ Incoming webhook OK:', response.status);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to n8n server');
    } else if (error.response?.status === 404) {
      console.log('❌ Webhook not found (404) - workflow not activated?');
    } else {
      console.log('❌ Error:', error.message);
    }
    return false;
  }
}

async function testOutgoingPoll() {
  console.log('\nTesting outgoing poll:', config.outgoingPoll);
  try {
    const response = await axios.get(config.outgoingPoll, {
      timeout: 5000
    });
    
    if (response.data && typeof response.data.messages !== 'undefined') {
      console.log('✅ Outgoing poll OK:', response.status);
      console.log('   Pending messages:', response.data.messages.length);
      return true;
    } else {
      console.log('⚠️  Poll endpoint responds but wrong format');
      console.log('   Expected: { messages: [...] }');
      console.log('   Got:', JSON.stringify(response.data));
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to n8n server');
    } else if (error.response?.status === 404) {
      console.log('❌ Poll endpoint not found (404) - workflow not activated?');
    } else {
      console.log('❌ Error:', error.message);
    }
    return false;
  }
}

async function runTests() {
  const test1 = await testIncomingWebhook();
  const test2 = await testOutgoingPoll();

  console.log('\n' + '='.repeat(50));
  if (test1 && test2) {
    console.log('✅ All tests passed! Ready to start the bridge.');
    console.log('\nRun: node index.js');
  } else {
    console.log('❌ Some tests failed. Check n8n workflows:');
    console.log('   1. Import workflows from n8n-workflows/');
    console.log('   2. Activate both workflows in n8n');
    console.log('   3. Verify webhook URLs match .env file');
  }
  console.log('='.repeat(50));
}

runTests();
