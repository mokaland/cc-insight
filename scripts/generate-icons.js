// PWAアイコン生成スクリプト
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const svgPath = path.join(__dirname, '../public/icon.svg');
const publicDir = path.join(__dirname, '../public');

async function generateIcons() {
  console.log('PWAアイコンを生成中...');

  const svgBuffer = fs.readFileSync(svgPath);

  for (const size of sizes) {
    const outputPath = path.join(publicDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✅ ${outputPath}`);
  }

  // favicon.ico用の小さいPNG（32x32）
  const faviconPath = path.join(publicDir, 'favicon.png');
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(faviconPath);
  console.log(`  ✅ ${faviconPath}`);

  // Apple Touch Icon (180x180)
  const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(appleTouchPath);
  console.log(`  ✅ ${appleTouchPath}`);

  console.log('\n🎉 アイコン生成完了！');
}

generateIcons().catch(console.error);
