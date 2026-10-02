import fs from 'fs';
import path from 'path';

function createIcoBuffer() {
  const sizes = [16, 32, 48];
  
  // Icon Header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(sizes.length, 4); // count of images

  const dirEntries = [];
  const imageBuffers = [];

  let currentOffset = 6 + (16 * sizes.length);

  for (const size of sizes) {
    const bmiHeader = Buffer.alloc(40);
    bmiHeader.writeUInt32LE(40, 0); // biSize
    bmiHeader.writeInt32LE(size, 4); // biWidth
    bmiHeader.writeInt32LE(size * 2, 8); // biHeight (doubled for XOR + AND)
    bmiHeader.writeUInt16LE(1, 12); // biPlanes
    bmiHeader.writeUInt16LE(32, 14); // biBitCount
    bmiHeader.writeUInt32LE(0, 16); // biCompression (BI_RGB)
    bmiHeader.writeUInt32LE(size * size * 4, 20); // biSizeImage
    bmiHeader.writeInt32LE(0, 24); // biXPelsPerMeter
    bmiHeader.writeInt32LE(0, 28); // biYPelsPerMeter
    bmiHeader.writeUInt32LE(0, 32); // biClrUsed
    bmiHeader.writeUInt32LE(0, 36); // biClrImportant

    // XOR pixel buffer: 32-bit BGRA (bottom-to-top)
    const xorBuffer = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = ((size - 1 - y) * size + x) * 4;
        let b = 24, g = 24, r = 24, a = 240;

        // Border
        if (x === 0 || x === size - 1 || y === 0 || y === size - 1) {
          b = 75; g = 75; r = 75; a = 255;
        }
        // Active Window indicator (Blue #0078D7)
        else if (x >= 2 && x <= Math.floor(size / 2) && y >= Math.floor(size / 3) && y <= size - 3) {
          b = 215; g = 120; r = 0; a = 255;
        }
        // Background window
        else if (x >= Math.floor(size / 3) + 1 && x <= size - 3 && y >= 2 && y <= Math.floor(size * 0.7)) {
          b = 48; g = 48; r = 48; a = 255;
          if (x === Math.floor(size / 3) + 1 || x === size - 3 || y === 2 || y === Math.floor(size * 0.7)) {
            b = 100; g = 100; r = 100; a = 255;
          }
        }

        xorBuffer[idx + 0] = b;
        xorBuffer[idx + 1] = g;
        xorBuffer[idx + 2] = r;
        xorBuffer[idx + 3] = a;
      }
    }

    // 1-bit AND mask: 0 = opaque, 1 = transparent
    const maskRowBytes = Math.floor((size + 31) / 32) * 4;
    const andMask = Buffer.alloc(maskRowBytes * size, 0);

    const fullImage = Buffer.concat([bmiHeader, xorBuffer, andMask]);
    imageBuffers.push(fullImage);

    // Directory entry: 16 bytes
    const dirEntry = Buffer.alloc(16);
    dirEntry.writeUInt8(size, 0); // width
    dirEntry.writeUInt8(size, 1); // height
    dirEntry.writeUInt8(0, 2);    // color count
    dirEntry.writeUInt8(0, 3);    // reserved
    dirEntry.writeUInt16LE(1, 4); // color planes
    dirEntry.writeUInt16LE(32, 6);// bits per pixel
    dirEntry.writeUInt32LE(fullImage.length, 8); // image size
    dirEntry.writeUInt32LE(currentOffset, 12); // image offset

    dirEntries.push(dirEntry);
    currentOffset += fullImage.length;
  }

  return Buffer.concat([header, ...dirEntries, ...imageBuffers]);
}

const icoBuf = createIcoBuffer();
const outDir = path.resolve('c_source');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
fs.writeFileSync(path.join(outDir, 'tabmaster.ico'), icoBuf);
console.log('Successfully generated c_source/tabmaster.ico, size:', icoBuf.length, 'bytes');
