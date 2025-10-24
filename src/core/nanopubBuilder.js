// src/core/nanopubBuilder.js (WASM-enabled)
import { initWasm, create_nanopub, sign_nanopub } from '../wasm/bridge.js';

export class NanopubBuilder {
  constructor(template) {
    this.template = template;
    this.wasmReady = initWasm();
  }

  async buildFromFormData(formData, metadata) {
    await this.wasmReady;
    
    // Use WASM for creating and signing
    const nanopub = create_nanopub(
      JSON.stringify({
        template: this.template,
        formData,
        metadata
      })
    );
    
    // Sign if key available
    if (metadata.privateKey) {
      return sign_nanopub(nanopub, metadata.privateKey);
    }
    
    return nanopub;
  }
}
