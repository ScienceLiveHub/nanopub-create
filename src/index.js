/**
 * NanopubCreator with WASM Integration
 * Main entry point with profile management and signing
 */

import './styles/tailwind.css';
import './styles/styles-index.css';

import { StorageAdapter } from './core/storage-adapter.js';
import { TemplateParser } from './core/templateParser.js';
import FormGenerator from './core/formGenerator.js';
import { NanopubBuilder } from './core/nanopubBuilder.js';
// Components
export { FieldComponents } from './components/fieldComponents.js';
export { makeOptionalCollapsible, makeOptionalGroupCollapsible } from './components/collapsible.js';
export { AutofillManager } from './components/autofill.js';

// Templates
export { BaseTemplate } from './templates/base/baseTemplate.js';
export { GeographicalTemplate } from './templates/geographical/geographicalTemplate.js';
export { TemplateRegistry } from './templates/registry.js';

import init, { Nanopub, NpProfile, KeyPair } from '@nanopub/sign';

/**
 * Convenience function to create a form from a template URI
 * @param {string} templateUri - Nanopub template URI
 * @param {HTMLElement} containerElement - Container to render form into
 * @returns {Promise<FormGenerator>} Form generator instance
 */
export async function createFormFromTemplate(templateUri, containerElement) {
  const parser = new TemplateParser();
  const template = await parser.fetchTemplate(templateUri);
  await parser.parseTemplate();
  
  const generator = new FormGenerator(parser.template);
  generator.render(containerElement);
  
  return generator;
}

// Dynamic WASM import that works in different environments
let nanopubSign;

async function initWasm() {
  if (nanopubSign) return nanopubSign;
  
  try {
    // Try to import the WASM module
    const module = await import('@nanopub/sign');
    nanopubSign = module;
    return nanopubSign;
  } catch (error) {
    console.error('Failed to load @nanopub/sign WASM module:', error);
    throw new Error('Could not initialize nanopub signing library');
  }
}


/**
 * Main NanopubCreator class with WASM support
 */
class NanopubCreator {
  constructor(options = {}) {
    this.options = {
      publishServer: options.publishServer || 'https://np.petapico.org',
      theme: options.theme || 'default',
      validateOnChange: options.validateOnChange !== false,
      showHelp: options.showHelp !== false,
      ...options
    };

    this.storage = new StorageAdapter(options.storage);
    this.template = null;
    this.formGenerator = null;
    this.builder = null;
    this.formData = {};
    this.container = null;
    this.wasmInitialized = false;

    // Profile storage
    this.profile = null;
    this.credentials = null;

    // Event listeners
    this.listeners = {
      change: [],
      submit: [],
      error: [],
      publish: [],
      profileNeeded: []
    };

    // Initialize WASM
    this.initWasm();
    
    // Load saved credentials
    this.loadCredentials();
  }

  /**
   * Initialize WASM module
   */
  async initWasm() {
    if (this.wasmInitialized) return;
    
    try {
      await init();
      this.wasmInitialized = true;
      console.log('✓ WASM initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WASM:', error);
      throw new Error('WASM initialization failed');
    }
  }

  /**
   * Ensure WASM is ready
   */
  async ensureWasm() {
    if (!this.wasmInitialized) {
      await this.initWasm();
    }
  }

  /**
   * Generate new RSA keypair using WASM
   */
  async generateKeys() {
    await this.ensureWasm();
    
    try {
      // Use nanopub-rs WASM to generate keys
      const keypair = new KeyPair();
      const keys = keypair.toJs();
      
      return {
        privateKey: keys.private,
        publicKey: keys.public
      };
    } catch (error) {
      console.error('Key generation failed:', error);
      throw new Error('Failed to generate RSA keys');
    }
  }

  /**
   * Setup user profile with key generation
   */
  async setupProfile(name, orcid) {
    await this.ensureWasm();

    // Normalize ORCID
    const normalizedOrcid = this.normalizeOrcid(orcid);

    try {
      // Generate keys
      const keys = await this.generateKeys();
      
      // Store profile with ORCID
      this.profile = {
        name,
        orcid: normalizedOrcid
      };
      
      // Store credentials with both keys AND orcid
      this.credentials = {
        ...keys,
        orcid: normalizedOrcid,  // Store ORCID here too!
        name: name               // And name for convenience
      };
      
      // Save to localStorage
      this.saveCredentials();
      
      console.log('✓ Profile setup complete');
      console.log('  ORCID:', normalizedOrcid);
      console.log('  Name:', name);
      return this.profile;
    } catch (error) {
      console.error('Profile setup failed:', error);
      throw error;
    }
  }

  /**
   * Normalize ORCID to full URL format
   */
  normalizeOrcid(orcid) {
    if (!orcid) return null;
    
    // Remove whitespace
    orcid = orcid.trim();
    
    // If already full URL, return as is
    if (orcid.startsWith('http')) {
      return orcid;
    }
    
    // If just the ID, add the URL prefix
    return `https://orcid.org/${orcid}`;
  }

  /**
   * Check if user has a profile configured
   */
  hasProfile() {
    return this.profile !== null && this.credentials !== null;
  }

  /**
   * Get current profile
   */
  getProfile() {
    return this.profile;
  }

  /**
   * Export keys (for backup)
   */
  exportKeys() {
    if (!this.credentials) {
      throw new Error('No credentials to export');
    }
    return { ...this.credentials };
  }

  /**
   * Import keys from backup
   */
  importKeys(profileData) {
    if (!profileData.privateKey || !profileData.publicKey) {
      throw new Error('Invalid profile data');
    }

    this.profile = {
      name: profileData.name,
      orcid: this.normalizeOrcid(profileData.orcid)
    };

    this.credentials = {
      privateKey: profileData.privateKey,
      publicKey: profileData.publicKey,
      orcid: this.normalizeOrcid(profileData.orcid),
      name: profileData.name
    };

    this.saveCredentials();
  }

  /**
   * Save credentials to storage
   */
  saveCredentials() {
    if (!this.profile || !this.credentials) return;

    try {
      const data = {
        profile: this.profile,
        credentials: this.credentials,
        savedAt: new Date().toISOString()
      };
      this.storage.setItem('nanopub_profile', JSON.stringify(data));
      console.log('✓ Profile saved to storage');
    } catch (error) {
      console.error('Failed to save credentials:', error);
      throw error;
    }
  }

  /**
   * Load credentials from storage
   */
  loadCredentials() {
    try {
      const stored = this.storage.getItem('nanopub_profile');
      if (stored) {
        const data = JSON.parse(stored);
        this.profile = data.profile;
        this.credentials = data.credentials;
        console.log('✓ Profile loaded from storage');
        return true;
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
    return false;
  }

  /**
   * Clear stored credentials
   */
  clearCredentials() {
    this.profile = null;
    this.credentials = null;
    try {
      this.storage.removeItem('nanopub_profile');
      console.log('✓ Profile cleared');
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    }
  }

  /**
   * Render form from template URI
   */
  async renderFromTemplateUri(templateUri, container) {
    this.container = container;

    try {
      // Parse template
      this.template = await TemplateParser.fetchAndParse(templateUri);
      
      // Store the template URI for builder
      this.template.uri = this.template.uri || templateUri;

      // Create form generator
      this.formGenerator = new FormGenerator(this.template, {
        validateOnChange: this.options.validateOnChange,
        showHelp: this.options.showHelp,
        labels: this.template.labels
      });

      // Set up form change handler
      this.formGenerator.on('change', (data) => {
        this.formData = data;
        this.emit('change', data);
      });

      // Set up form submit handler
      this.formGenerator.on('submit', async (data) => {
        this.formData = data.formData || data;
        
        // Check if profile is needed for signing
        if (!this.hasProfile()) {
          this.emit('profileNeeded', {});
          return;
        }
        
        try {
          const trigContent = await this.generateNanopub();
          this.emit('submit', { trigContent, formData: this.formData });
        } catch (error) {
          this.emit('error', { type: 'generation', error });
        }
      });

      // Render the form
      this.formGenerator.renderForm(container);

      // Create builder
      this.builder = new NanopubBuilder(this.template);

    } catch (error) {
      this.emit('error', { type: 'template', error });
      throw error;
    }
  }

  /**
   * Generate nanopublication from form data
   */
  async generateNanopub() {
    if (!this.builder) {
      throw new Error('No template loaded');
    }

    const metadata = {
      creator: this.profile ? this.profile.orcid : null,
      creatorName: this.profile ? this.profile.name : null,
      created: new Date().toISOString()
    };

    return await this.builder.buildFromFormData(this.formData, metadata);
  }

  /**
   * Sign and publish nanopublication
   * If publishServer is null, only signs and returns content for download
   */
  async publish(trigContent) {
    await this.ensureWasm();

    if (!this.hasProfile()) {
      throw new Error('Profile not configured. Cannot sign nanopublication.');
    }

    try {
      // Get ORCID - try credentials first, then profile
      const orcid = this.credentials.orcid || this.profile.orcid;
      const name = this.credentials.name || this.profile.name;
      
      // Validate ORCID format
      if (!orcid || !orcid.startsWith('https://orcid.org/')) {
        throw new Error(`Invalid ORCID format: ${orcid}. Must start with https://orcid.org/`);
      }
      
      console.log('🔐 Creating profile and signing...');
      console.log('  ORCID:', orcid);
      console.log('  Name:', name);
      
      // Create NpProfile with correct 3 parameters: privateKey, orcid, name
      // (Public key is derived from private key automatically)
      const npProfile = new NpProfile(
        this.credentials.privateKey,
        orcid,
        name
      );

      console.log('✅ Profile created');
      console.log('📝 Signing nanopub...');

      // Create Nanopub and sign it
      const nanopub = new Nanopub(trigContent);
      const signedNp = nanopub.sign(npProfile);  // Takes 1 param: profile

      console.log('✅ Signed successfully');
      console.log('  Signed type:', typeof signedNp);
      
      // Get signed content
      const signedContent = signedNp.rdf();
      
      // Check if we should publish or just return signed content
      if (!this.options.publishServer) {
        console.log('📥 Download-only mode (no publish server configured)');
        
        this.emit('publish', {
          uri: null,
          signedContent: signedContent,
          downloadOnly: true
        });

        return { signedContent: signedContent, downloadOnly: true };
      }

      console.log('📤 Publishing to network...');
      console.log('   Server:', this.options.publishServer);

      // publish() in Rust takes: publish(Option<profile>, Option<server_url>)
      // In WASM/JS this becomes: publish(profile_or_null, server_or_null)
      const result = await signedNp.publish(npProfile, this.options.publishServer);
      
      console.log('✅ Published successfully!');
      console.log('🌐 Result:', result);
      
      // Get the URI from result
      const uri = typeof result === 'string' ? result : (result.uri || result.nanopub_uri);
      
      this.emit('publish', {
        uri: uri,
        signedContent: signedContent
      });

      return { uri: uri, nanopub_uri: uri, signedContent: signedContent };

    } catch (error) {
      console.error('❌ Sign/Publish failed:', error);
      console.error('Error details:', error.message);
      this.emit('error', { type: 'publish', error });
      throw error;
    }
  }

  /**
   * Event emitter
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}

export default NanopubCreator;
