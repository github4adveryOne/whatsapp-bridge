# Install WhatsApp Bridge as Auto-Restart Service

## Problem
The bridge was crashing and stopping polling. We need it to **NEVER stop** - auto-restart on crashes, boot on startup, run forever.

## Solution: systemd Service

Install the bridge as a systemd service with **unlimited auto-restart**.

## Installation Steps

### 1. Run the install script (requires sudo password)
```bash
cd ~/whatsapp-bridge
./install-service.sh
```

When prompted, enter your sudo password.

### 2. Verify it's running
```bash
sudo systemctl status whatsapp-bridge
```

You should see:
```
● whatsapp-bridge.service - WhatsApp Bridge for n8n
   Loaded: loaded
   Active: active (running)
```

### 3. Check logs
```bash
# View recent logs
sudo journalctl -u whatsapp-bridge -n 50

# Follow live logs
sudo journalctl -u whatsapp-bridge -f

# Or view the log file
tail -f ~/whatsapp-bridge/bridge.log
```

## What the Service Does

✅ **Auto-start on boot** - Starts when server reboots
✅ **Auto-restart on crash** - Restarts within 10 seconds if it crashes
✅ **Unlimited retries** - Will NEVER give up trying to restart
✅ **Proper logging** - All output saved to `bridge.log`
✅ **Network-aware** - Waits for network to be online before starting

## Service Commands

```bash
# Check status
sudo systemctl status whatsapp-bridge

# Start (if stopped)
sudo systemctl start whatsapp-bridge

# Stop
sudo systemctl stop whatsapp-bridge

# Restart
sudo systemctl restart whatsapp-bridge

# View logs (live)
sudo journalctl -u whatsapp-bridge -f

# View logs (last 100 lines)
sudo journalctl -u whatsapp-bridge -n 100

# Disable (stop auto-start on boot)
sudo systemctl disable whatsapp-bridge

# Enable (auto-start on boot)
sudo systemctl enable whatsapp-bridge
```

## Current Status

The bridge is currently running **manually** (PID 20562) with these protections:
- ✅ Crash protection (uncaughtException/unhandledRejection handlers)
- ❌ NO auto-restart on crash
- ❌ NO auto-start on boot

**To make it permanent, install the service!**

## Manual Start (Temporary)

If you need to start it manually without the service:
```bash
cd ~/whatsapp-bridge
nohup node index.js > bridge.log 2>&1 &

# Check it's running
ps aux | grep "node index"

# View logs
tail -f bridge.log
```

But this is **not recommended** - use the service instead!

## Why the Service is Critical

**Without the service:**
- Bridge crashes → stops polling → messages don't send
- Server reboots → bridge doesn't start → WhatsApp offline
- Network issues → bridge might not recover

**With the service:**
- Bridge crashes → auto-restarts in 10 seconds
- Server reboots → bridge starts automatically
- Network issues → systemd retries until it works
- **Guaranteed uptime** 🟢

## Troubleshooting

**Service won't start?**
```bash
# Check what went wrong
sudo journalctl -u whatsapp-bridge -n 50

# Check if another process is using the session
ps aux | grep chrome | grep whatsapp
killall -9 chrome node
sudo systemctl restart whatsapp-bridge
```

**Service keeps restarting?**
```bash
# View the crash logs
sudo journalctl -u whatsapp-bridge -n 200

# Common issues:
# - WhatsApp session expired → Re-scan QR code
# - Port conflict → Check nothing else is using WhatsApp session
# - Missing dependencies → npm install in bridge directory
```

**Want to update the bridge code?**
```bash
# 1. Edit index.js or .env
# 2. Restart the service
sudo systemctl restart whatsapp-bridge

# The new code will be loaded
```

## Next Steps

1. **Install the service** (run `./install-service.sh`)
2. **Verify it's working** (`sudo systemctl status whatsapp-bridge`)
3. **Test auto-restart** by killing the process: `sudo pkill -9 node`
4. **Check it restarted** within 10 seconds: `sudo systemctl status whatsapp-bridge`

Once installed, you'll **never need to manually restart it again**! 🎉
