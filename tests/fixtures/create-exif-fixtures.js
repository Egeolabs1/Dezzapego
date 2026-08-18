#!/usr/bin/env node
import { writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const FIXTURES_DIR = dirname(__filename);

const LUM_QT = [8,6,6,7,6,5,8,7,7,7,9,9,8,10,12,20,13,12,11,11,12,25,18,19,15,20,29,26,31,30,29,26,28,27,32,36,46,39,32,34,44,35,27,28,40,55,41,44,48,49,52,52,52,31,39,57,61,56,50,60,46,51,52,50];
const DC_LEN = [0,0,1,5,1,1,1,1,1,1,0,0,0,0,0,0];
const DC_SYM = [0,1,2,3,4,5,6,7,8,9,10,11];
const AC_LEN = [0,2,1,3,3,2,4,3,5,5,4,4,0,0,1,125];
const AC_SYM = [1,2,3,0,4,17,5,18,33,49,65,6,19,81,97,7,34,113,20,50,129,145,161,8,35,66,177,193,21,82,209,240,36,51,98,114,130,9,10,22,23,24,25,26,37,38,39,40,41,42,52,53,54,55,56,57,58,67,68,69,70,71,72,73,74,83,84,85,86,87,88,89,90,99,100,101,102,103,104,105,106,115,116,117,118,119,120,121,122,131,132,133,134,135,136,137,138,146,147,148,149,150,151,152,153,154,162,163,164,165,166,167,168,169,170,178,179,180,181,182,183,184,185,186,194,195,196,197,198,199,200,201,202,210,211,212,213,214,215,216,217,218,225,226,227,228,229,230,231,232,233,234,241,242,243,244,245,246,247,248,249,250];

function buildHuffman(len, sym) {
  const t = new Map();
  let c = 0;
  const s = [...sym];
  for (let b = 1; b <= 16; b++) {
    for (let j = 0; j < len[b - 1]; j++) {
      t.set(s.shift(), { code: c, bits: b });
      c++;
    }
    c <<= 1;
  }
  return t;
}

const dcHuff = buildHuffman([...DC_LEN], [...DC_SYM]);
const acHuff = buildHuffman([...AC_LEN], [...AC_SYM]);

class BitWriter {
  constructor() { this.bytes = []; this.byte = 0; this.pos = 0; }
  writeBits(code, bits) {
    for (let i = bits - 1; i >= 0; i--) {
      this.byte = (this.byte << 1) | ((code >> i) & 1);
      if (++this.pos === 8) { this.bytes.push(this.byte); this.byte = 0; this.pos = 0; }
    }
  }
  writeDC(val) {
    const n = val === 0 ? 0 : Math.floor(Math.log2(val < 0 ? -val : val)) + 1;
    const info = dcHuff.get(n);
    this.writeBits(info.code, info.bits);
    if (n > 0) {
      const v = val < 0 ? val + (1 << n) - 1 : val;
      this.writeBits(v, n);
    }
  }
  writeAC(sym) { const info = acHuff.get(sym); this.writeBits(info.code, info.bits); }
  flush() {
    if (this.pos > 0) {
      this.byte = (this.byte << (8 - this.pos)) | ((1 << (8 - this.pos)) - 1);
      this.bytes.push(this.byte);
    }
    return Buffer.from(this.bytes);
  }
}

function w16(b, o, v) { b[o] = (v >> 8) & 0xff; b[o + 1] = v & 0xff; }

function makeExifAPP1(orientation) {
  const buf = Buffer.alloc(200);
  let o = 0;
  buf[o++] = 0xff; buf[o++] = 0xe1;
  const lenPos = o; o += 2;
  buf.write('Exif', o); o += 4;
  buf[o++] = 0; buf[o++] = 0;
  const tiffStart = o;
  buf[o++] = 0x4d; buf[o++] = 0x4d;
  buf[o++] = 0; buf[o++] = 0x2a;
  const ifdField = o; o += 4;
  const ifd = tiffStart + 8;
  // Write 32-bit IFD offset (big-endian)
  buf[ifdField] = 0; buf[ifdField + 1] = 0;
  buf[ifdField + 2] = (ifd - tiffStart) >> 8;
  buf[ifdField + 3] = (ifd - tiffStart) & 0xff;
  w16(buf, ifd, 1);
  o = ifd + 2;
  w16(buf, o, 0x0112); o += 2;
  w16(buf, o, 3); o += 2;
  buf[o++] = 0; buf[o++] = 0; buf[o++] = 0; buf[o++] = 1;
  w16(buf, o, orientation); o += 2;
  buf[o++] = 0; buf[o++] = 0;
  w16(buf, lenPos, 2 + 6 + (o - tiffStart));
  return buf.subarray(0, o);
}

function makeJPEG(width, height, orientation) {
  const parts = [];
  const bw = new BitWriter();
  bw.writeDC(3);
  for (let i = 1; i < width * height; i++) bw.writeAC(0);
  parts.push(Buffer.from([0xff, 0xd8]));
  parts.push(makeExifAPP1(orientation));
  const dqt = Buffer.alloc(67);
  dqt[0] = 0xff; dqt[1] = 0xdb; w16(dqt, 2, 67); dqt[4] = 0;
  for (let i = 0; i < 64; i++) dqt[5 + i] = LUM_QT[i];
  parts.push(dqt);
  const sof = Buffer.alloc(19);
  sof[0] = 0xff; sof[1] = 0xc0; w16(sof, 2, 19); sof[4] = 8;
  w16(sof, 5, height); w16(sof, 7, width);
  sof[9] = 1; sof[10] = 1; sof[11] = 0x11; sof[12] = 0;
  parts.push(sof);
  const dhtDC = Buffer.alloc(193);
  dhtDC[0] = 0xff; dhtDC[1] = 0xc4; w16(dhtDC, 2, 193); dhtDC[4] = 0;
  for (let i = 0; i < 16; i++) dhtDC[5 + i] = DC_LEN[i];
  for (let i = 0; i < DC_SYM.length; i++) dhtDC[21 + i] = DC_SYM[i];
  parts.push(dhtDC);
  const dhtAC = Buffer.alloc(403);
  dhtAC[0] = 0xff; dhtAC[1] = 0xc4; w16(dhtAC, 2, 403); dhtAC[4] = 0x10;
  for (let i = 0; i < 16; i++) dhtAC[5 + i] = AC_LEN[i];
  for (let i = 0; i < AC_SYM.length; i++) dhtAC[21 + i] = AC_SYM[i];
  parts.push(dhtAC);
  const sos = Buffer.alloc(14);
  sos[0] = 0xff; sos[1] = 0xda; w16(sos, 2, 14);
  sos[4] = 1; sos[5] = 1; sos[6] = 0x00; sos[7] = 0x3f; sos[8] = 0x00;
  parts.push(sos);
  parts.push(bw.flush());
  parts.push(Buffer.from([0xff, 0xd9]));
  return Buffer.concat(parts);
}

const fixtures = [
  // Existing 20x20 fixtures
  { name: 'exif-orientation-1.jpg', width: 20, height: 20, orientation: 1 },
  { name: 'exif-orientation-6.jpg', width: 20, height: 20, orientation: 6 },
  { name: 'exif-orientation-3.jpg', width: 20, height: 20, orientation: 3 },
  // Non-square 40x20 fixtures
  { name: 'exif-orientation-1-40x20.jpg', width: 40, height: 20, orientation: 1 },
  { name: 'exif-orientation-3-40x20.jpg', width: 40, height: 20, orientation: 3 },
  { name: 'exif-orientation-6-40x20.jpg', width: 40, height: 20, orientation: 6 },
  { name: 'exif-orientation-8-40x20.jpg', width: 40, height: 20, orientation: 8 },
];

if (!existsSync(FIXTURES_DIR)) mkdirSync(FIXTURES_DIR, { recursive: true });

for (const f of fixtures) {
  const buf = makeJPEG(f.width, f.height, f.orientation);
  const fp = resolve(FIXTURES_DIR, f.name);
  writeFileSync(fp, buf);
  console.log('Created: ' + f.name + ' (' + buf.length + ' bytes, ' + f.width + 'x' + f.height + ', orientation=' + f.orientation + ')');
}

for (const f of fixtures) {
  const fp = resolve(FIXTURES_DIR, f.name);
  const s = statSync(fp);
  console.log('Verified: ' + f.name + ' exists, ' + s.size + ' bytes');
}
