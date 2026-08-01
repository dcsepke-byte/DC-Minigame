/* Asset-Loader Unit-Tests (Node, ohne DOM) */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Registry-Logik isoliert testen — wir simulieren den AssetLoader
// durch Lesen der Quelle (die IIFE), ohne echte DOM-Abhängigkeiten.
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/asset-loader.js', import.meta.url), 'utf8');

test('asset-loader.js enthält Registry-API', () => {
  assert.match(src, /function register/);
  assert.match(src, /function getRegistry/);
  assert.match(src, /window\.AssetLoader/);
});

test('asset-loader.js unterstützt 2D- und 3D-Pfade', () => {
  assert.match(src, /\.glb/);
  assert.match(src, /\.gltf/);
  assert.match(src, /\.svg/);
  assert.match(src, /\.png/);
});

test('asset-loader.js hat Fallback-Logik', () => {
  assert.match(src, /type: 'fallback'/);
  assert.match(src, /type: 'primitive'/);
});

test('asset-loader.js seedet 8 Charaktere + 7 Inseln + default', () => {
  const names = ['brix', 'nixie', 'pip', 'koko', 'tiko', 'bolt', 'bloom', 'momo'];
  for (const n of names) {
    assert.match(src, new RegExp(`R\\.register\\('${n}'`));
  }
  for (let i = 1; i <= 7; i++) {
    assert.match(src, new RegExp(`R\\.register\\('island-${i}'`));
  }
  assert.match(src, /R\.register\('default'/);
});

test('asset-loader.js registriert Farben und Biome', () => {
  assert.match(src, /color: '#ff6a00'/); // Brix
  assert.match(src, /biome: 'beach'/);   // Sonnenstrand
  assert.match(src, /biome: 'finale'/);  // Sternenzitadelle
});
