import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WIDTH = 50;
const HEIGHT = 50;

// --- CRC32 implementation (no deps) ---
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length, typeBytes, data, crc]);
}

// 1. PNG signature
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// 2. IHDR chunk
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(WIDTH, 0);
ihdrData.writeUInt32BE(HEIGHT, 4);
ihdrData[8] = 8;   // bit depth
ihdrData[9] = 2;   // color type: RGB
ihdrData[10] = 0;  // compression method: deflate
ihdrData[11] = 0;  // filter method: adaptive
ihdrData[12] = 0;  // interlace method: none
const ihdr = makeChunk('IHDR', ihdrData);

// 3. IDAT chunk — raw pixel data then zlib deflate
const rowSize = 1 + WIDTH * 3;
const rawData = Buffer.alloc(HEIGHT * rowSize);
for (let y = 0; y < HEIGHT; y++) {
  const rowOffset = y * rowSize;
  rawData[rowOffset] = 0; // filter byte: None
  for (let x = 0; x < WIDTH; x++) {
    const px = rowOffset + 1 + x * 3;
    rawData[px] = 255;   // R
    rawData[px + 1] = 0; // G
    rawData[px + 2] = 0; // B
  }
}
const compressed = zlib.deflateSync(rawData);
const idat = makeChunk('IDAT', compressed);

// 4. IEND chunk (empty data)
const iend = makeChunk('IEND', Buffer.alloc(0));

// Assemble and write
const png = Buffer.concat([signature, ihdr, idat, iend]);
const outPath = path.join(__dirname, 'test-upload-50x50.png');
fs.writeFileSync(outPath, png);
console.log(`PNG written to: ${outPath}`);
console.log(`Size: ${png.length} bytes`);
console.log(`Dimensions: ${WIDTH}x${HEIGHT}, solid red (RGB 255,0,0)`);
