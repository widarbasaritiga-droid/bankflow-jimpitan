// Script untuk membuat icon PWA dari base image
// Jalankan: node create-icons.js

const fs = require('fs');
const path = require('path');

// Dimensi icon yang diperlukan
const iconSizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 }
];

// Template untuk membuat icon placeholder jika tidak ada gambar asli
function createPlaceholderIcon(size, name) {
  console.log(`Membuat placeholder icon: ${name} (${size}x${size})`);
  
  // Ini hanya contoh - dalam prakteknya Anda perlu menggunakan library seperti sharp
  // atau menyediakan gambar asli
  const placeholderContent = `<!-- Placeholder untuk ${name} -->
<!-- Ganti dengan gambar asli untuk PWA yang optimal -->`;
  
  fs.writeFileSync(name, placeholderContent);
  console.log(`  ✓ ${name} dibuat`);
}

// Fungsi utama
function main() {
  console.log('Membuat icon PWA untuk JIMPITAN MANG RESTI');
  console.log('===========================================');
  
  // Cek apakah ada file icon source
  const sourceFiles = ['icon.png', 'icon.jpg', 'logo.png', 'logo.jpg'];
  let hasSource = false;
  
  for (const file of sourceFiles) {
    if (fs.existsSync(file)) {
      hasSource = true;
      console.log(`✓ Ditemukan file sumber: ${file}`);
      break;
    }
  }
  
  if (!hasSource) {
    console.log('⚠  Tidak ditemukan file sumber icon.');
    console.log('   Buat file icon.png (minimal 512x512) untuk hasil terbaik.');
  }
  
  // Buat semua icon yang diperlukan
  for (const icon of iconSizes) {
    createPlaceholderIcon(icon.size, icon.name);
  }
  
  // Buat favicon.ico (ikon 16x16 dalam format ICO)
  console.log('\nMembuat favicon.ico...');
  fs.writeFileSync('favicon.ico', '');
  console.log('  ✓ favicon.ico dibuat');
  
  // Buat readme untuk icon
  const readme = `# PWA Icons untuk JIMPITAN MANG RESTI

Ikon yang diperlukan untuk Progressive Web App (PWA):

## File Ikon:

1. **favicon.ico** - Ikon untuk browser lama (32x32 atau 16x16)
2. **favicon-16x16.png** - Ikon 16x16 untuk tab browser
3. **favicon-32x32.png** - Ikon 32x32 untuk tab browser
4. **apple-touch-icon.png** - Ikon 180x180 untuk iOS homescreen
5. **android-chrome-192x192.png** - Ikon 192x192 untuk Android
6. **android-chrome-512x512.png** - Ikon 512x512 untuk splash screen

## Cara Mengganti dengan Gambar Asli:

1. Siapkan gambar logo dengan format PNG
2. Ukuran minimal 512x512 piksel
3. Background transparan atau sesuai tema
4. Ganti file-file di atas dengan gambar asli Anda
5. Pastikan semua file berada di root folder aplikasi

## Tools yang Direkomendasikan:

1. **Favicon Generator**: https://realfavicongenerator.net/
2. **PWA Image Generator**: https://www.pwabuilder.com/imageGenerator
3. **Android Asset Studio**: https://romannurik.github.io/AndroidAssetStudio/

## Testing PWA:

1. Buka Chrome DevTools > Application > Manifest
2. Cek apakah semua ikon terdeteksi
3. Test installability di Chrome DevTools > Lighthouse
`;
  
  fs.writeFileSync('ICONS-README.md', readme);
  console.log('\n✓ ICONS-README.md dibuat dengan petunjuk lengkap');
  
  console.log('\n✅ Semua file icon telah dibuat!');
  console.log('\n⚠  CATATAN: Icon saat ini adalah placeholder.');
  console.log('   Ganti dengan gambar asli untuk pengalaman PWA yang optimal.');
}

// Jalankan script
if (require.main === module) {
  main();
}

module.exports = { createPlaceholderIcon };
