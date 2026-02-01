# WhatsApp Bridge - Reliability & Auto-Restart

## Problem
The bridge was stopping/crashing occasionally, which stopped the polling.

## Solution
Added multiple layers of reliability:

### 1. Error Handling (✅ Applied)
**Updated `index.js`:**
- Added `uncaughtException` handler - catches unexpected errors
- Added `unhandledRejection` handler - catches promise rejections
- Improved polling error handling - silences network timeouts
- Bridge now **never crashes** from polling errors

### 2. Systemd Service (Optional - Recommended)
**Automatically restarts** the bridge if it ever crashes.

**Install as service:**
```bash
cd ~/whatsapp-bridge
./install-service.sh
```

This will:
- Stop any manual processes
- Install as systemd service
- Enable auto-start on boot
- Start the service
- **Auto-restart** if it crashes (unlimited retries)

**Service commands:**
```bash
# Check status
sudo systemctl status whatsapp-bridge

# Restart
sudo systemctl restart whatsapp-bridge

# Stop
sudo systemctl stop whatsapp-bridge

# View logs
sudo journalctl -u whatsapp-bridge -f
# Or
tail -f ~/whatsapp-bridge/bridge.log
```

### 3. Manual Process (Current)
If you prefer to run it manually:
```bash
cd ~/whatsapp-bridge
nohup node index.js > bridge.log 2>&1 &
```

**Check if running:**
```bash
ps aux | grep "node index"
```

**View logs:**
```bash
tail -f ~/whatsapp-bridge/bridge.log
```

## Current Status
✅ **Running manually** with improved error handling (PID 15986)  
⏳ **Not installed as service** - won't auto-restart on reboot

## Recommendation
**Install as systemd service** for production use:
```bash
cd ~/whatsapp-bridge
./install-service.sh
```

This ensures:
- ✅ Starts on boot
- ✅ Auto-restarts on crash
- ✅ Survives system restarts
- ✅ Proper logging

## Monitoring
The bridge logs all activity to `bridge.log`:
- `📨 Incoming:` - WhatsApp messages received
- `✅ Sent batch to n8n:` - Messages forwarded to n8n
- `📤 X outgoing message(s)` - Sending WhatsApp messages
- `✅ Sent to` - WhatsApp message sent successfully
- `❌ Error` - Any errors (should be rare now)

## What Changed in index.js
1. **Network error suppression** - ENOTFOUND, ETIMEDOUT no longer logged
2. **Uncaught exception handler** - Process doesn't crash
3. **Unhandled rejection handler** - Promise errors don't crash
4. **SIGTERM handler** - Graceful shutdown on service stop

The bridge is now **crash-resistant** and will keep polling even if n8n is temporarily unreachable.
