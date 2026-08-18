/**
 * Gera uma fixture WebP válida (10x10 pixels, vermelho) usando sharp.
 */
const sharp = require('sharp');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const outPath = resolve(__dirname, 'test-10x10-red.webp');

sharp({
  create: {
    width: 10,
    height: 10,
    channels: 4,
    background: { r: 255, g: 0, b: 0, alpha: 1 },
  },
})
  .webp({ quality: 82 })
  .toBuffer()
  .then((buf) => {
    writeFileSync(outPath, buf);
    console.log(`Created ${outPath} (${buf.length} bytes)`);
    console.log(`Header: ${buf.slice(0, 4).toString('ascii')}`);
    console.log(`WEBP: ${buf.slice(8, 12).toString('ascii')}`);
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
