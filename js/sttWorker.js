import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js';

env.allowLocalModels = false;

let asr = null;
let announced = false;

async function getModel() {
  if (!asr) {
    asr = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
      progress_callback: progress => self.postMessage({ type: 'progress', progress })
    });
  }
  if (!announced) {
    announced = true;
    self.postMessage({ type: 'ready' });
  }
  return asr;
}

self.addEventListener('message', async event => {
  const { type, id, audio } = event.data || {};
  if (type !== 'transcribe') return;
  try {
    const model = await getModel();
    const out = await model(audio, { chunk_length_s: 30, stride_length_s: 5 });
    const text = Array.isArray(out) ? out.map(o => o.text).join(' ') : out.text;
    self.postMessage({ type: 'result', id, text: String(text || '').trim() });
  } catch (err) {
    self.postMessage({ type: 'error', id, message: String((err && err.message) || err) });
  }
});