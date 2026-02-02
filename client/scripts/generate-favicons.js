// generate-favicons.js
// Usage: node scripts/generate-favicons.js [sourceImage]
// Default source is client/public/favicon.png

const path = require('path');
const fs = require('fs');
const Jimp = require('jimp');
const pngToIco = require('png-to-ico');

async function generate(source) {
  source = source || path.join(__dirname, '..', 'public', 'favicon.png');
  const rootOut = path.resolve(__dirname, '..', '..'); // repo root
  const clientPublic = path.resolve(__dirname, '..', 'public');

  if (!fs.existsSync(source)) {
    console.error('Source image not found:', source);
    process.exit(1);
  }

  console.log('Reading source image:', source);

  const image = await Jimp.read(source);

  // create 32x32 and 16x16 PNGs
  const sizes = [32, 16];
  for (const s of sizes) {
    const outName = `favicon-${s}x${s}.png`;
    const buf = await image.clone().contain(s, s, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE).getBufferAsync(Jimp.MIME_PNG);

    // write to client/public
    fs.writeFileSync(path.join(clientPublic, outName), buf);
    // write to repo root
    fs.writeFileSync(path.join(rootOut, outName), buf);
    console.log('Written', outName);
  }

  // generate favicon.ico (png-to-ico expects a single file path and creates 48, 32, 16)
  const ico = await pngToIco(path.join(clientPublic, 'favicon-32x32.png'));

  // write to client/public and root
  fs.writeFileSync(path.join(clientPublic, 'favicon.ico'), ico);
  fs.writeFileSync(path.join(rootOut, 'favicon.ico'), ico);
  console.log('Written favicon.ico to', clientPublic, 'and', rootOut);

  // also copy source as favicon.png (so HTML that references that file works)
  fs.copyFileSync(source, path.join(clientPublic, 'favicon.png'));
  fs.copyFileSync(source, path.join(rootOut, 'favicon.png'));
  console.log('Copied source to favicon.png in both locations.');

  console.log('Done. Clear browser cache or hard-reload to see the updated favicon.');
}

const srcArg = process.argv[2];
generate(srcArg).catch(err => {
  console.error(err);
  process.exit(1);
});