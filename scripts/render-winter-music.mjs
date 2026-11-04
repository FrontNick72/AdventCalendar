// Original instrumental sketch for this project: celesta, soft keys and a waltz bass.
// No samples or third-party recordings. Render: node scripts/render-winter-music.mjs
// AAC conversion uses macOS afconvert; the temporary PCM file is removed on success.
import { mkdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rate = 44100;
const beat = 60 / 72;
const duration = 32 * 3 * beat;
const length = Math.round(duration * rate);
const left = new Float32Array(length);
const right = new Float32Array(length);
const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

function note(midi, start, seconds, gain, pan, bell = false) {
  const count = Math.floor(seconds * rate);
  const offset = Math.round(start * rate);
  const f = frequency(midi);
  for (let i = 0; i < count; i++) {
    const t = i / rate;
    const attack = 1 - Math.exp(-t / (bell ? 0.012 : 0.035));
    const release = Math.min(1, (seconds - t) / 0.18);
    const envelope = attack * release * Math.exp(-t / (bell ? 1.3 : 1.05));
    const phase = 2 * Math.PI * f * t;
    const tone = bell
      ? Math.sin(phase) + 0.23 * Math.sin(phase * 2.004) * Math.exp(-t * 2) + 0.06 * Math.sin(phase * 4.01) * Math.exp(-t * 4)
      : Math.sin(phase) + 0.17 * Math.sin(phase * 2) + 0.035 * Math.sin(phase * 3);
    const sample = gain * tone * envelope;
    const index = (offset + i) % length;
    left[index] += sample * Math.sqrt((1 - pan) / 2);
    right[index] += sample * Math.sqrt((1 + pan) / 2);
  }
}

// Sixteen original bars in C major, repeated with a lighter upper voice.
const harmony = [
  [48, 60, 64, 67], [43, 59, 62, 67], [45, 60, 64, 69], [40, 59, 64, 67],
  [41, 60, 65, 69], [48, 60, 64, 67], [50, 60, 65, 69], [43, 59, 62, 67],
  [48, 60, 64, 67], [47, 59, 62, 67], [45, 60, 64, 69], [43, 59, 62, 67],
  [41, 60, 65, 69], [50, 60, 65, 69], [43, 59, 62, 67], [48, 60, 64, 67],
];
const melody = [
  [76, 79, 83], [81, 79, 74], [76, 81, 79], [76, 74, 71],
  [72, 77, 81], [79, 76, 74], [77, 76, 72], [74, 71, 79],
  [84, 83, 79], [81, 79, 74], [76, 79, 81], [83, 79, 74],
  [81, 77, 76], [77, 74, 72], [71, 74, 79], [76, 74, 72],
];
for (let bar = 0; bar < 32; bar++) {
  const start = bar * 3 * beat;
  const chord = harmony[bar % 16];
  note(chord[0], start, 2.4, 0.19, -0.1);
  for (const tick of [1, 2]) {
    chord.slice(1).forEach((pitch, i) => note(pitch, start + tick * beat + i * 0.027, 2, 0.065, (i - 1) * 0.3));
  }
  melody[bar % 16].forEach((pitch, i) => {
    note(pitch, start + i * beat, 3.7, bar < 16 ? 0.15 : 0.12, 0.15, true);
    if (bar >= 16 && i === 0) note(pitch + 12, start, 3, 0.025, -0.4, true);
  });
}

// A circular room tail keeps the rendered loop continuous at the seam.
const dryLeft = left.slice();
const dryRight = right.slice();
for (let i = 0; i < length; i++) {
  for (const [delay, gain] of [[0.173, 0.17], [0.337, 0.12], [0.571, 0.08], [0.919, 0.045]]) {
    const source = (i - Math.round(delay * rate) + length) % length;
    left[i] += dryRight[source] * gain;
    right[i] += dryLeft[source] * gain;
  }
}
let peak = 0;
for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const pcm = Buffer.alloc(44 + length * 4);
pcm.write('RIFF', 0); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(rate, 24); pcm.writeUInt32LE(rate * 4, 28);
pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(length * 4, 40);
for (let i = 0; i < length; i++) {
  pcm.writeInt16LE(Math.round(left[i] / peak * 0.32 * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(right[i] / peak * 0.32 * 32767), 46 + i * 4);
}
const directory = fileURLToPath(new URL('../public/audio/', import.meta.url));
mkdirSync(directory, { recursive: true });
const wav = `${directory}winter-house.wav`;
writeFileSync(wav, pcm);
const result = spawnSync('/usr/bin/afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '96000', wav, `${directory}winter-house.m4a`], { stdio: 'inherit' });
if (result.status !== 0) throw new Error('AAC conversion failed; PCM source kept in public/audio.');
unlinkSync(wav);
console.log(`Rendered ${duration.toFixed(0)}s original winter loop to public/audio/winter-house.m4a`);
