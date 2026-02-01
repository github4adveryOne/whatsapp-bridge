#!/bin/bash

echo "📦 Installing WhatsApp Bridge as systemd service..."

# Stop any running manual processes
echo "Stopping manual processes..."
pkill -9 -f "node.*index.js" 2>/dev/null
pkill -9 chrome 2>/dev/null
sleep 2

# Copy service file
echo "Installing service file..."
sudo cp whatsapp-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable and start service
echo "Enabling service..."
sudo systemctl enable whatsapp-bridge

echo "Starting service..."
sudo systemctl start whatsapp-bridge

sleep 3

# Check status
echo ""
echo "✅ Service installed!"
echo ""
sudo systemctl status whatsapp-bridge --no-pager -l

echo ""
echo "📋 Useful commands:"
echo "  sudo systemctl status whatsapp-bridge    # Check status"
echo "  sudo systemctl restart whatsapp-bridge   # Restart"
echo "  sudo systemctl stop whatsapp-bridge      # Stop"
echo "  sudo journalctl -u whatsapp-bridge -f    # Follow logs"
echo "  tail -f ~/whatsapp-bridge/bridge.log     # View log file"
