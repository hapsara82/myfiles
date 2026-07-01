const axios = require('axios');
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function downloadAndZipOVPNFiles() {
  try {
    console.log('Fetching VPN Gate API...');
    const response = await axios.get('https://www.vpngate.net/api/iphone/');
    const lines = response.data.split('\n').slice(1);
    
    const zip = new JSZip();
    const countryCounter = {}; // Hitung server per negara
    let count = 0;
    
    console.log('Processing OVPN files...');
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(',');
      
      // Ambil country code dari kolom ke-7 (index 6)
      const countryCode = parts[6]?.trim()?.toUpperCase();
      if (!countryCode || countryCode.length !== 2) continue;
      
      // Hitung nomor urut per negara
      countryCounter[countryCode] = (countryCounter[countryCode] || 0) + 1;
      const fileLabel = `${countryCode}${countryCounter[countryCode]}`;
      
      // Cari base64 encoded OVPN config
      for (let i = 0; i < parts.length; i++) {
        const column = parts[i].trim();
        
        if (column.length > 100 && /^[A-Za-z0-9+/=]+$/.test(column)) {
          try {
            const ovpnConfig = Buffer.from(column, 'base64').toString('utf-8');
            
            if (ovpnConfig.includes('BEGIN CERTIFICATE') || ovpnConfig.includes('BEGIN OPENVPN STATIC KEY')) {
              const filename = `${fileLabel}.ovpn`;
              zip.file(filename, ovpnConfig);
              console.log(`✓ Added: ${filename}`);
              count++;
              break;
            }
          } catch (e) {
            // Skip
          }
        }
      }
    }

    console.log(`\nTotal files: ${count}`);
    console.log('Country breakdown:', countryCounter);
    
    if (count > 0) {
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      fs.writeFileSync('ovpn.zip', zipBuffer);
      const sizeInMB = (zipBuffer.length / 1024 / 1024).toFixed(2);
      console.log(`✓ Zipped successfully: ovpn.zip (${sizeInMB} MB)`);
    } else {
      console.log('No OVPN files found.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

downloadAndZipOVPNFiles();
