// Renders every spoken line in the game to public/vo/<id>.mp3.
//
//   Voices: Kokoro-82M (Apache 2.0) run locally, so there is no API, no key, no
//   per-character cost and the game ships plain audio files. Character voices
//   come from Kokoro's own voice packs, then ffmpeg adds the menace: pitch
//   shifts, tremolo, bit-crushing, echo, radio filters.
//
//   Setup (once, in any scratch folder, not in the game):
//     npm i kokoro-js
//     download onnx-community/Kokoro-82M-v1.0-ONNX (config.json, tokenizer.json,
//     tokenizer_config.json, onnx/model_quantized.onnx) into <folder>/models/onnx-community/Kokoro-82M-v1.0-ONNX/
//   Run (from the game folder, ffmpeg on PATH):
//     KOKORO_DIR=<folder> node scripts/vo/render.mjs [id-prefix] [--force]
//   Existing files are skipped, so it resumes where it stopped.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');
const KOKORO = process.env.KOKORO_DIR;
if (!KOKORO) throw new Error('Set KOKORO_DIR to the folder where kokoro-js is installed.');
const OUT = path.join(ROOT, 'public', 'vo');
fs.mkdirSync(OUT, { recursive: true });

// ---------------------------------------------------------------- characters
// voice: a Kokoro voice pack. speed: speaking rate. pitch: <1 deeper, >1 higher
// (a resample trick that also moves the voice's body size). fx: an ffmpeg audio filter chain.
const ECHO_CHAMBER = 'aecho=0.8:0.6:45|110|220:0.35|0.25|0.15';
const CHARACTERS = {
  narrator: { voice: 'am_fenrir', speed: 0.86, pitch: 0.94, fx: 'highpass=f=70,equalizer=f=150:t=q:w=1.1:g=5,acompressor=threshold=0.08:ratio=3:attack=5:release=90,aecho=0.8:0.55:70|140:0.25|0.14' },
  oblivax: { voice: 'bm_george', speed: 0.8, pitch: 0.74, fx: `tremolo=f=47:d=0.3,acrusher=bits=11:mode=log:aa=1:mix=0.45,equalizer=f=90:t=q:w=1:g=7,${ECHO_CHAMBER}` },
  echo: { voice: 'af_nova', speed: 1.0, pitch: 1.02, fx: 'highpass=f=300,lowpass=f=3500,acrusher=bits=12:mode=lin:mix=0.3,aecho=0.7:0.5:22:0.18,volume=1.4' },
  vex: { voice: 'bm_lewis', speed: 0.88, pitch: 0.86, fx: `tremolo=f=33:d=0.2,equalizer=f=2400:t=q:w=1.4:g=3,${ECHO_CHAMBER}` },
  'WARLORD VEX': 'vex',
  civilian: { voice: 'af_bella', speed: 1.05, pitch: 1.0, fx: 'aecho=0.6:0.4:40:0.12' },
  SYNAPSE: { voice: 'am_adam', speed: 1.0, pitch: 0.93, fx: 'acrusher=bits=9:mode=lin:mix=0.5,tremolo=f=90:d=0.25,aecho=0.7:0.5:30|60:0.3|0.2' },
  MAGMAW: { voice: 'am_onyx', speed: 0.82, pitch: 0.72, fx: `acrusher=bits=10:mode=log:mix=0.4,equalizer=f=110:t=q:w=1:g=6,${ECHO_CHAMBER}` },
  SKYRENDER: { voice: 'af_kore', speed: 0.92, pitch: 0.95, fx: 'tremolo=f=6:d=0.25,aecho=0.8:0.6:60|130:0.4|0.25,equalizer=f=3000:t=q:w=1.5:g=3' },
  CRYOSS: { voice: 'bm_daniel', speed: 0.9, pitch: 0.9, fx: 'highpass=f=140,aecho=0.8:0.7:80|170:0.4|0.3,equalizer=f=4500:t=q:w=1.4:g=4' },
  RAZORBACK: { voice: 'am_michael', speed: 0.92, pitch: 0.8, fx: 'acrusher=bits=8:mode=lin:mix=0.45,equalizer=f=1800:t=q:w=1.2:g=4,aecho=0.7:0.5:35:0.25' },
  'IRON ONI': { voice: 'bm_lewis', speed: 0.8, pitch: 0.7, fx: `tremolo=f=22:d=0.3,equalizer=f=200:t=q:w=1:g=5,${ECHO_CHAMBER}` },
  MONOLITH: { voice: 'am_onyx', speed: 0.72, pitch: 0.62, fx: `equalizer=f=70:t=q:w=1:g=8,aecho=0.9:0.7:90|200|420:0.5|0.35|0.2` },
  KRAG: { voice: 'am_eric', speed: 0.95, pitch: 0.85, fx: 'highpass=f=200,lowpass=f=4200,acrusher=bits=11:mode=lin:mix=0.3,aecho=0.7:0.5:30:0.2,volume=1.2' },
  MORVETH: { voice: 'bm_fable', speed: 0.82, pitch: 0.88, fx: `tremolo=f=5:d=0.3,equalizer=f=3500:t=q:w=1.4:g=3,aecho=0.9:0.7:70|150|310:0.5|0.35|0.25` },
  // Heroes: clear, heroic, lightly reverbed.
  'hero:arc': { voice: 'am_adam', speed: 1.02, pitch: 1.0, fx: 'aecho=0.6:0.4:35:0.12' },
  'hero:talon': { voice: 'af_nova', speed: 1.05, pitch: 0.97, fx: 'aecho=0.6:0.4:35:0.12' },
  'hero:tempest': { voice: 'am_michael', speed: 0.95, pitch: 0.9, fx: 'aecho=0.7:0.5:50|100:0.25|0.15' },
  'hero:orion': { voice: 'af_river', speed: 0.98, pitch: 1.0, fx: 'aecho=0.6:0.4:35:0.12' },
  'hero:weaver': { voice: 'af_sky', speed: 1.08, pitch: 1.04, fx: 'aecho=0.6:0.4:30:0.1' },
  'hero:havoc': { voice: 'af_jessica', speed: 1.0, pitch: 0.93, fx: 'equalizer=f=1500:t=q:w=1.2:g=3,aecho=0.6:0.4:35:0.12' },
  'hero:ronin': { voice: 'bm_daniel', speed: 0.92, pitch: 0.96, fx: 'aecho=0.6:0.4:40:0.15' },
  'hero:psion': { voice: 'am_puck', speed: 1.0, pitch: 1.0, fx: 'aecho=0.7:0.5:50|110:0.3|0.2' },
  'hero:vanguard': { voice: 'am_eric', speed: 0.96, pitch: 0.94, fx: 'aecho=0.6:0.4:35:0.12' },
  'hero:vesper': { voice: 'bf_isabella', speed: 0.96, pitch: 0.97, fx: 'aecho=0.7:0.5:60|120:0.3|0.2' },
};
const character = (who) => {
  const c = CHARACTERS[who];
  if (c == null) throw new Error(`No character for "${who}"`);
  return typeof c === 'string' ? CHARACTERS[c] : c;
};

// ---------------------------------------------------------------- lines
const esbuild = (await import(pathToFileURL(path.join(ROOT, 'node_modules/esbuild/lib/main.js')).href)).default;
const bundle = path.join(os.tmpdir(), 'surge-vo-lines.mjs');
await esbuild.build({ entryPoints: [path.join(ROOT, 'scripts/vo/lines.ts')], bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error' });
const { LINES } = await import(pathToFileURL(bundle).href);

const args = process.argv.slice(2);
const force = args.includes('--force');
const prefix = args.find((a) => !a.startsWith('--')) ?? '';
const todo = LINES.filter((l) => l.id.startsWith(prefix) && (force || !fs.existsSync(path.join(OUT, `${l.id}.mp3`)))).sort((a, b) => a.priority - b.priority);
console.log(`${todo.length} of ${LINES.length} lines to render`);

const { KokoroTTS } = await import(pathToFileURL(path.join(KOKORO, 'node_modules/kokoro-js/dist/kokoro.js')).href);
const { env } = await import(pathToFileURL(path.join(KOKORO, 'node_modules/@huggingface/transformers/dist/transformers.node.mjs')).href);
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = path.join(KOKORO, 'models');
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'surge-vo-'));
let done = 0;
for (const line of todo) {
  const c = character(line.who);
  const wav = path.join(tmp, `${line.id}.wav`);
  const t0 = Date.now();
  const audio = await tts.generate(line.text, { voice: c.voice, speed: c.speed });
  await audio.save(wav);
  // Pitch shift without changing length, then the character's chain, then even loudness.
  const p = c.pitch ?? 1;
  const chain = [
    'apad=pad_dur=0.5',
    ...(p !== 1 ? [`asetrate=${Math.round(24000 * p)}`, 'aresample=24000', `atempo=${(1 / p).toFixed(4)}`] : []),
    c.fx,
    'loudnorm=I=-17:TP=-1.5:LRA=11',
  ].join(',');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-af', chain, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', path.join(OUT, `${line.id}.mp3`)]);
  done += 1;
  console.log(`[${done}/${todo.length}] ${line.id} (${line.who}) ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log('done');
