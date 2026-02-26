const Aseprite = require('ase-parser');
const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const OUTPUT_DIR = './out/icons';
const TARGET_SIZE = 72;

/** Remove leading underscore, convert snake_case to Capitalized Words, move leading "Egg" to end, uppercase roman numerals */
function formatSliceName(name: string): string {
  let formatted = name
    .replace(/^_/, '')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/\bI[iv]+\b|(?<=\s)Ii+\b/g, match => match.toUpperCase());

  if (formatted.startsWith('Egg ')) {
    formatted = formatted.slice(4) + ' Egg';
  }

  return formatted;
}

async function makePNG() {
  const buff = fs.readFileSync("F:\\Games\\steamapps\\common\\AutoForge\\data\\textures\\sheets\\icons\\icons.aseprite");
  const ase = new Aseprite(buff, 'icons.aseprite');
  
  ase.parse();

  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Get the cels for the last frame
  const lastFrame = ase.frames.at(-1);
  if (!lastFrame) {
    console.error('No frames found in the Aseprite file.');
    return;
  }
  const cels = lastFrame.cels
    .map((a: any) => a)
    .sort((a: any, b: any) => {
      const orderA = a.layerIndex + a.zIndex;
      const orderB = b.layerIndex + b.zIndex;
      return orderA - orderB || a.zIndex - b.zIndex;
    });
  
  // Manually composite in sRGB/gamma space (matches Aseprite's blending)
  const pixelBuf = Buffer.alloc(ase.width * ase.height * 4, 0);

  for (const cel of cels) {
    if (!cel.rawCelData) continue;
    const celOpacity = cel.opacity / 255;
    for (let cy = 0; cy < cel.h; cy++) {
      for (let cx = 0; cx < cel.w; cx++) {
        const srcIdx = (cy * cel.w + cx) * 4;
        const dstX = cel.xpos + cx;
        const dstY = cel.ypos + cy;
        if (dstX < 0 || dstX >= ase.width || dstY < 0 || dstY >= ase.height) continue;
        const dstIdx = (dstY * ase.width + dstX) * 4;

        const srcR = cel.rawCelData[srcIdx];
        const srcG = cel.rawCelData[srcIdx + 1];
        const srcB = cel.rawCelData[srcIdx + 2];
        const srcA = (cel.rawCelData[srcIdx + 3] / 255) * celOpacity;

        const dstR = pixelBuf[dstIdx] ?? 0;
        const dstG = pixelBuf[dstIdx + 1] ?? 0;
        const dstB = pixelBuf[dstIdx + 2] ?? 0;
        const dstA = (pixelBuf[dstIdx + 3] ?? 0) / 255;

        const outA = srcA + dstA * (1 - srcA);
        if (outA > 0) {
          pixelBuf[dstIdx]     = Math.round((srcR * srcA + dstR * dstA * (1 - srcA)) / outA);
          pixelBuf[dstIdx + 1] = Math.round((srcG * srcA + dstG * dstA * (1 - srcA)) / outA);
          pixelBuf[dstIdx + 2] = Math.round((srcB * srcA + dstB * dstA * (1 - srcA)) / outA);
          pixelBuf[dstIdx + 3] = Math.round(outA * 255);
        }
      }
    }
  }

  // Extract each slice as a separate image directly from the raw pixel buffer
  console.log(`Found ${ase.slices.length} slices, extracting...`);

  const slicePromises = ase.slices.map(async (slice: any) => {
    const key = slice.keys[0]; // use the first key for position/size
    if (!key) return;

    // Copy slice pixels from the raw composited buffer
    const sliceRaw = Buffer.alloc(key.width * key.height * 4, 0);
    for (let row = 0; row < key.height; row++) {
      const srcOffset = ((key.y + row) * ase.width + key.x) * 4;
      const dstOffset = row * key.width * 4;
      pixelBuf.copy(sliceRaw, dstOffset, srcOffset, srcOffset + key.width * 4);
    }

    let pipeline = sharp(sliceRaw, { raw: { width: key.width, height: key.height, channels: 4 } });

    // Resize to TARGET_SIZE if smaller, leave alone if bigger
    if (key.width <= TARGET_SIZE && key.height <= TARGET_SIZE) {
      pipeline = pipeline.resize(TARGET_SIZE, TARGET_SIZE, { kernel: sharp.kernel.nearest, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
    }

    const sliceBuff = await pipeline.png().toBuffer();

    const fileName = formatSliceName(slice.name);
    const outPath = path.join(OUTPUT_DIR, `${fileName}.png`);
    fs.writeFileSync(outPath, sliceBuff);
  });

  await Promise.all(slicePromises);
  console.log(`Done! Extracted ${ase.slices.length} slice images to ${OUTPUT_DIR}`);
}

makePNG();