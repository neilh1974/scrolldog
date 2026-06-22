import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const sizes = [16, 32, 48, 96, 128, 256, 512, 1024];
const colors = {
  clear: [0, 0, 0, 0],
  ink: [27, 23, 20, 255],
  fur: [208, 138, 87, 255],
  light: [230, 161, 110, 255],
  cream: [255, 241, 223, 255],
  blue: [139, 215, 255, 255],
};

const pixels = [
  '....IIIII.......',
  '...IFLLLFI......',
  '..IFFFFFLLI.....',
  '..IFFCCFFFI.....',
  '..IFCICICFI.....',
  '..IFFCCFFFI.....',
  '...IFIIIIF......',
  '....ICCCI.......',
  '...IFFFFFI......',
  '..IFFLLLFFI.....',
  '.IFFLCCCLFFI....',
  '.IFLCCCCCLFI.I..',
  '.IFLCCCCCLFIIIF.',
  '..IFFLCLFFI.I...',
  '...I.I.I........',
  '...I...I........',
];

const map = {
  '.': colors.clear,
  'I': colors.ink,
  'F': colors.fur,
  'L': colors.light,
  'C': colors.cream,
  'B': colors.blue,
};

for (const size of sizes) {
  const png = renderPng(size);
  writeFileSync(new URL(`../icons/icon${size}.png`, import.meta.url), png);
}

function renderPng(size) {
  const width = size;
  const height = size;
  const data = Buffer.alloc(width * height * 4, 0);
  const cell = size / 16;

  for (let row = 0; row < pixels.length; row += 1) {
    for (let col = 0; col < pixels[row].length; col += 1) {
      const rgba = map[pixels[row][col]] || colors.clear;
      fillRect(data, width, height, Math.floor(col * cell), Math.floor(row * cell), Math.ceil(cell), Math.ceil(cell), rgba);
    }
  }

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rawRow = y * (width * 4 + 1);
    raw[rawRow] = 0;
    data.copy(raw, rawRow + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', Buffer.concat([u32(width), u32(height), Buffer.from([8, 6, 0, 0, 0])])),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function fillRect(data, width, height, x, y, w, h, rgba) {
  for (let yy = y; yy < Math.min(y + h, height); yy += 1) {
    for (let xx = x; xx < Math.min(x + w, width); xx += 1) {
      const i = (yy * width + xx) * 4;
      data[i] = rgba[0];
      data[i + 1] = rgba[1];
      data[i + 2] = rgba[2];
      data[i + 3] = rgba[3];
    }
  }
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const body = Buffer.concat([typeBuffer, data]);
  return Buffer.concat([u32(data.length), body, u32(crc32(body))]);
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & (0 - (crc & 1)));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
