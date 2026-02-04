const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Base icon design (simple BankFlow logo)
async function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#1A237E');  // Primary blue
  gradient.addColorStop(1, '#00BFA5');  // Accent teal
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Draw circle
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/3, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw "B" letter
  ctx.fillStyle = '#1A237E';
  ctx.font = `bold ${size/2}px Inter`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('B', size/2, size/2);
  
  // Add border
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size/30;
  ctx.strokeRect(size/20, size/20, size - size/10, size - size/10);
  
  return canvas;
}

// Create all icons
async function createAllIcons() {
  console.log('🎨 Creating PWA icons...');
  
  // Create icons directory if not exists
  const iconsDir = path.join(__dirname, 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  for (const size of iconSizes) {
    const icon = await createIcon(size);
    const buffer = icon.toBuffer('image/png');
    const filename = `icon-${size}x${size}.png`;
    const filepath = path.join(iconsDir, filename);
    
    fs.writeFileSync(filepath, buffer);
    console.log(`✅ Created ${filename}`);
  }
  
  // Create maskable icon (rounded square)
  const maskableIcon = await createIcon(192);
  const maskableCtx = maskableIcon.getContext('2d');
  
  // Add rounded corners
  maskableCtx.fillStyle = 'transparent';
  maskableCtx.globalCompositeOperation = 'destination-in';
  maskableCtx.beginPath();
  maskableCtx.roundRect(0, 0, 192, 192, 48);
  maskableCtx.fill();
  
  const maskableBuffer = maskableIcon.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), maskableBuffer);
  console.log('✅ Created maskable icon');
  
  console.log('🎉 All icons created successfully!');
}

createAllIcons().catch(console.error);