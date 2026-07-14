import fs from "node:fs";

function wav(samples, sampleRate) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  }
  return buf;
}

function tone(freq, durationMs, sampleRate, ampFn) {
  const n = Math.round((sampleRate * durationMs) / 1000);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = ampFn(i / n);
    out[i] = Math.sin(2 * Math.PI * freq * t) * env;
  }
  return out;
}

function concat(...arrs) {
  return arrs.flat();
}

// quick fade in/out envelope to avoid clicks
function env(x) {
  const a = Math.min(1, x / 0.08);
  const b = Math.min(1, (1 - x) / 0.15);
  return Math.min(a, b);
}

const SR = 8000;

// Correct: bright two-note ascending chime (C6 -> E6)
const correct = concat(
  tone(1046.5, 90, SR, env),
  tone(1318.5, 130, SR, env)
);

// Wrong: short low descending buzz
const wrong = concat(
  tone(220, 90, SR, env),
  tone(164.8, 120, SR, env)
);

const correctB64 = wav(correct, SR).toString("base64");
const wrongB64 = wav(wrong, SR).toString("base64");

fs.writeFileSync("/tmp/claude-0/-home-user-worldwise/14fc3e11-b640-5357-ab12-810dea349161/scratchpad/correct.b64", correctB64);
fs.writeFileSync("/tmp/claude-0/-home-user-worldwise/14fc3e11-b640-5357-ab12-810dea349161/scratchpad/wrong.b64", wrongB64);
console.log("correct bytes:", correctB64.length, "wrong bytes:", wrongB64.length);
