// One-off helper: synthesize the notification ping WAV.
// Run with: node scripts/generate-ping.js
//
// Output: assets/sounds/ping.wav — a short two-tone "bing-bong" at 880/1320 Hz.
// 22050 Hz mono 16-bit PCM, ~0.3s, ~13KB. Plays cleanly through expo-av on iOS + Android.

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;

function envelope(t, duration) {
  const attack = 0.005;
  const release = 0.06;
  if (t < attack) return t / attack;
  if (t > duration - release) return Math.max(0, (duration - t) / release);
  return 1;
}

function generatePing() {
  // Two notes, the second held longer — classic notification feel.
  const notes = [
    { freq: 880,  duration: 0.10 },  // A5
    { freq: 1320, duration: 0.20 },  // E6 (perfect fifth above)
  ];
  const totalDuration = notes.reduce((s, n) => s + n.duration, 0);
  const numSamples = Math.floor(totalDuration * SAMPLE_RATE);

  // 44-byte WAV header + samples (16-bit, 2 bytes each)
  const buf = Buffer.alloc(44 + numSamples * 2);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + numSamples * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);                  // fmt chunk size
  buf.writeUInt16LE(1, 20);                   // PCM
  buf.writeUInt16LE(1, 22);                   // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);     // byte rate
  buf.writeUInt16LE(2, 32);                   // block align
  buf.writeUInt16LE(16, 34);                  // bits/sample
  buf.write('data', 36);
  buf.writeUInt32LE(numSamples * 2, 40);

  let offset = 0;
  for (const note of notes) {
    const noteSamples = Math.floor(note.duration * SAMPLE_RATE);
    for (let i = 0; i < noteSamples; i++) {
      const t = i / SAMPLE_RATE;
      const env = envelope(t, note.duration);
      const sample = Math.sin(2 * Math.PI * note.freq * t) * 0.55 * env;
      buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.floor(sample * 32767))),
        44 + (offset + i) * 2);
    }
    offset += noteSamples;
  }

  const out = path.join(__dirname, '..', 'assets', 'sounds', 'ping.wav');
  fs.writeFileSync(out, buf);
  console.log(`Wrote ${out} (${buf.length} bytes, ${totalDuration.toFixed(2)}s)`);
}

generatePing();
