const QRCode = require('qrcode');
const fs = require('fs');

// Get QR data from command line
const qrData = process.argv[2];

if (!qrData) {
  console.error('Usage: node generate-qr.js <qr-data>');
  process.exit(1);
}

QRCode.toFile('whatsapp-qr.png', qrData, {
  width: 800,
  margin: 2
}, (err) => {
  if (err) {
    console.error('Error generating QR code:', err);
    process.exit(1);
  }
  console.log('QR code saved to whatsapp-qr.png');
});
