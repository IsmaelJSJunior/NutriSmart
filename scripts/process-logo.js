import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function processLogo() {
  console.log('Reading Logo.jpeg...');
  const { data, info } = await sharp('public/Logo.jpeg').raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;

  // 1. Flood fill to find all connected background paper
  const isOuterBg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h * 2);
  let head = 0, tail = 0;

  const isBgSeed = (x, y) => {
    const idx = (y * w + x) * 3;
    const r = data[idx], g = data[idx+1], b = data[idx+2];
    const diff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    return (r > 155 && g > 150 && b > 140 && diff < 28);
  };

  // Seed borders
  for (let x = 0; x < w; x++) {
    for (const y of [0, 1, h - 2, h - 1]) {
      if (isBgSeed(x, y) && !isOuterBg[y * w + x]) {
        isOuterBg[y * w + x] = 1;
        queue[tail++] = x;
        queue[tail++] = y;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, 1, w - 2, w - 1]) {
      if (isBgSeed(x, y) && !isOuterBg[y * w + x]) {
        isOuterBg[y * w + x] = 1;
        queue[tail++] = x;
        queue[tail++] = y;
      }
    }
  }

  const dx = [1, -1, 0, 0];
  const dy = [0, 0, 1, -1];

  while (head < tail) {
    const cx = queue[head++];
    const cy = queue[head++];

    for (let i = 0; i < 4; i++) {
      const nx = cx + dx[i];
      const ny = cy + dy[i];
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
        const nidx = ny * w + nx;
        if (!isOuterBg[nidx]) {
          const pidx = nidx * 3;
          const r = data[pidx], g = data[pidx+1], b = data[pidx+2];
          const diff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
          if (r > 165 && g > 160 && b > 150 && diff < 26) {
            isOuterBg[nidx] = 1;
            queue[tail++] = nx;
            queue[tail++] = ny;
          }
        }
      }
    }
  }

  console.log('Detected background pixels:', tail / 2);

  // 2. Anti-aliasing / smoothing on border
  const alphaMask = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    alphaMask[i] = isOuterBg[i] ? 0.0 : 1.0;
  }

  const smoothedAlpha = new Float32Array(w * h);
  const radius = 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (y < radius || y >= h - radius || x < radius || x >= w - radius) {
        smoothedAlpha[y * w + x] = alphaMask[y * w + x];
        continue;
      }

      const centerVal = alphaMask[y * w + x];
      let isEdge = false;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (alphaMask[(y + dy) * w + (x + dx)] !== centerVal) {
            isEdge = true;
            break;
          }
        }
        if (isEdge) break;
      }

      if (!isEdge) {
        smoothedAlpha[y * w + x] = centerVal;
      } else {
        let sum = 0, count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const weight = 1 / (1 + Math.hypot(dx, dy));
            sum += alphaMask[(y + dy) * w + (x + dx)] * weight;
            count += weight;
          }
        }
        smoothedAlpha[y * w + x] = sum / count;
      }
    }
  }

  // 3. Assemble RGBA buffer with defringe
  const out = Buffer.alloc(w * h * 4);
  const paperR = 248, paperG = 244, paperB = 238;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const a = smoothedAlpha[idx];
      const i3 = idx * 3;
      const i4 = idx * 4;

      let r = data[i3], g = data[i3 + 1], b = data[i3 + 2];

      if (a > 0.01 && a < 0.99) {
        r = Math.min(255, Math.max(0, Math.round((r - paperR * (1 - a)) / a)));
        g = Math.min(255, Math.max(0, Math.round((g - paperG * (1 - a)) / a)));
        b = Math.min(255, Math.max(0, Math.round((b - paperB * (1 - a)) / a)));
      }

      out[i4] = r;
      out[i4 + 1] = g;
      out[i4 + 2] = b;
      out[i4 + 3] = Math.round(a * 255);
    }
  }

  console.log('Writing public/Logo.png...');
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 8 })
    .toFile('public/Logo.png');

  console.log('Copying to public/logo.png...');
  fs.copyFileSync('public/Logo.png', 'public/logo.png');

  console.log('Writing favicon.png (512x512)...');
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 8 })
    .toFile('public/favicon.png');

  console.log('Writing favicon.ico (64x64)...');
  await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('public/favicon.ico');

  // Also clean up any test files
  for (const f of ['public/test_transparent_circle.png', 'public/test_transparent_all_bg.png', 'public/test_floodfill_outside.png', 'public/test_transparent_inside_too.png']) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  console.log('DONE!');
}

processLogo().catch(err => {
  console.error('Error in processLogo:', err);
  process.exit(1);
});
