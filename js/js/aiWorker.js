/*----- OFFLINE LLM WEB WORKER -----*/
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js';

class ModelSingleton {
  static task = 'text-generation';
  static model = 'Xenova/SmolLM2-360M-Instruct'; // Lightweight, optimized for browser inference
  static instance = null;

  static async getInstance(progress_callback) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;

  if (type === 'LOAD_MODEL') {
    try {
      self.postMessage({ status: 'loading', message: 'Downloading offline AI model (cached once)...' });
      await ModelSingleton.getInstance((progress) => {
        self.postMessage({ status: 'progress', progress });
      });
      self.postMessage({ status: 'ready', message: 'Offline AI model active.' });
    } catch (err) {
      self.postMessage({ status: 'error', message: err.message });
    }
  }

  if (type === 'GENERATE_AI') {
    try {
      const generator = await ModelSingleton.getInstance();
      
      // SOP System Prompt & Local Context Injection
      const messages = [
        { 
          role: 'system', 
          content: `You are RuralCare Clinical AI, an offline assistant for frontline health workers. Adhere strictly to primary healthcare SOPs. Current local data context: ${data.patientContext}` 
        },
        { role: 'user', content: data.prompt }
      ];

      const prompt = generator.tokenizer.apply_chat_template(messages, {
        tokenize: false,
        add_generation_prompt: true,
      });

      const output = await generator(prompt, {
        max_new_tokens: 200,
        temperature: 0.2,
        do_sample: true,
      });

      const reply = output[0].generated_text.slice(prompt.length).trim();
      self.postMessage({ status: 'complete', reply });
    } catch (err) {
      self.postMessage({ status: 'error', message: err.message });
    }
  }
});