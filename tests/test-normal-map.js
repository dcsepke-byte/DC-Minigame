/**
 * Normal Map Generation — Unit-Tests
 *
 * Testet die prozedurale Normal-Map-Generierung aus Noise-Textur-Pixeldaten.
 * Sobel-Operator auf Graustufen-Bild → Normal-Vektor pro Pixel.
 */

// Mock: simulate a simple 4x4 grayscale image
// We test the sobel normal computation on raw pixel arrays

function computeNormalMap(imageData, width, height) {
  // imageData: Uint8ClampedArray [r,g,b,a, r,g,b,a, ...]
  // Returns: Uint8ClampedArray [r,g,b,a, ...] with normal vectors encoded as RGB
  const out = new Uint8ClampedArray(width * height * 4);
  const getGray = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 128;
    const i = (y * width + x) * 4;
    return imageData[i]; // R channel = grayscale
  };

  const strength = 2.5;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Sobel operator
      const tl = getGray(x - 1, y - 1), t = getGray(x, y - 1), tr = getGray(x + 1, y - 1);
      const l = getGray(x - 1, y), r = getGray(x + 1, y);
      const bl = getGray(x - 1, y + 1), b = getGray(x, y + 1), br = getGray(x + 1, y + 1);

      const gx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const gy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      // Convert to normal vector
      const nx = -gx * strength / 255;
      const ny = -gy * strength / 255;
      const nz = 1.0;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

      const idx = (y * width + x) * 4;
      out[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      out[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      out[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      out[idx + 3] = 255;
    }
  }
  return out;
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; }
  else { console.error('FAIL:', msg); failed++; }
}

// Test 1: Flat image → all normals point up (z=1)
{
  const w = 4, h = 4;
  const flat = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < flat.length; i += 4) {
    flat[i] = 128; flat[i + 1] = 128; flat[i + 2] = 128; flat[i + 3] = 255;
  }
  const normals = computeNormalMap(flat, w, h);
  // All normals should be (128, 128, 255) = straight up
  for (let i = 0; i < normals.length; i += 4) {
    assert(normals[i + 2] === 255, 'Flat: Z channel should be 255');
    assert(Math.abs(normals[i] - 128) <= 1, 'Flat: X channel near 128');
    assert(Math.abs(normals[i + 1] - 128) <= 1, 'Flat: Y channel near 128');
  }
}

// Test 2: Vertical edge (left half dark, right half bright)
{
  const w = 4, h = 4;
  const edge = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const v = x < 2 ? 0 : 255;
      edge[i] = v; edge[i + 1] = v; edge[i + 2] = v; edge[i + 3] = 255;
    }
  }
  const normals = computeNormalMap(edge, w, h);
  // At the edge (x=1), normal tilts LEFT toward dark side → X < 128
  const centerIdx = (1 * w + 1) * 4; // pixel at (1,1) - near edge
  assert(normals[centerIdx] < 128, 'Edge: X should tilt left (dark on left)');
  // In a 4x4 image with hard edge, no pixel is truly flat (out-of-bounds defaults to 128)
  // Instead verify the normal at (0,0) is non-trivial (not pure Z)
  const cornerIdx = (0 * w + 0) * 4;
  assert(normals[cornerIdx + 2] < 255, 'Corner pixel: Z should not be 255 (near edge + boundary)');
}

// Test 3: Horizontal edge (top half dark, bottom half bright)
{
  const w = 4, h = 4;
  const edge = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const v = y < 2 ? 0 : 255;
      edge[i] = v; edge[i + 1] = v; edge[i + 2] = v; edge[i + 3] = 255;
    }
  }
  const normals = computeNormalMap(edge, w, h);
  const centerIdx = (1 * w + 1) * 4;
  assert(normals[centerIdx + 1] < 128, 'Horizontal edge: Y should tilt up (dark above)');
}

// Test 4: Output dimensions match input
{
  const w = 8, h = 6;
  const data = new Uint8ClampedArray(w * h * 4);
  data.fill(128);
  const normals = computeNormalMap(data, w, h);
  assert(normals.length === w * h * 4, 'Output length matches input');
}

// Test 5: All output alpha = 255
{
  const w = 4, h = 4;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 64 + Math.floor(Math.random() * 128);
    data[i + 3] = 255;
  }
  const normals = computeNormalMap(data, w, h);
  for (let i = 3; i < normals.length; i += 4) {
    assert(normals[i] === 255, 'Alpha should be 255');
  }
}

// Test 6: Normal vectors are unit length (within tolerance)
{
  const w = 4, h = 4;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(Math.random() * 256);
    data[i + 3] = 255;
  }
  const normals = computeNormalMap(data, w, h);
  for (let i = 0; i < normals.length; i += 4) {
    const nx = (normals[i] / 255) * 2 - 1;
    const ny = (normals[i + 1] / 255) * 2 - 1;
    const nz = (normals[i + 2] / 255) * 2 - 1;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    assert(Math.abs(len - 1.0) < 0.01, `Normal should be unit length, got ${len.toFixed(4)}`);
  }
}

console.log(`\nNormal Map Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
