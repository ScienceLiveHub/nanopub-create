// src/core/publisher.js (WASM-enabled)
import { initWasm, publish_nanopub } from '../wasm/bridge.js';

export class NanopubPublisher {
  constructor(options = {}) {
    this.options = options;
    this.wasmReady = initWasm();
  }

  async publish(trigContent) {
    await this.wasmReady;
    
    const result = await publish_nanopub(
      trigContent,
      this.options.server || 'https://np.petapico.org/'
    );
    
    return JSON.parse(result);
  }
}
