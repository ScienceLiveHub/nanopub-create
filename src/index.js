/**
 * NanopubCreator with WASM Integration
 * Main entry point with profile management and signing
 */

import { TemplateParser } from './core/templateParser.js';
import FormGenerator from './core/formGenerator.js';
import { NanopubBuilder } from './core/nanopubBuilder.js';
import init, { Nanopub, NpProfile, KeyPair } from '@nanopub/sign';

/**
 * Main NanopubCreator class with WASM support
 */
class NanopubCreator {
  constructor(options = {}) {
    this.options = {
      publishServer: options.publishServer || 'https://np.petapico.org/',
      theme: options.theme || 'default',
      validateOnChange: options.validateOnChange !== false,
      showHelp: options.showHelp !== false,
      ...options
    };

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
      
      // Store profile and credentials
      this.profile = {
        name,
        orcid: normalizedOrcid
      };
      
      this.credentials = keys;
      
      // Save to localStorage
      this.saveCredentials();
      
      console.log('✓ Profile setup complete');
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
      publicKey: profileData.publicKey
    };

    this.saveCredentials();
  }

  /**
   * Save credentials to localStorage
   */
  saveCredentials() {
    if (!this.profile || !this.credentials) return;

    try {
      const data = {
        profile: this.profile,
        credentials: this.credentials,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('nanopub_profile', JSON.stringify(data));
      console.log('✓ Profile saved to localStorage');
    } catch (error) {
      console.error('Failed to save credentials:', error);
    }
  }

  /**
   * Load credentials from localStorage
   */
  loadCredentials() {
    try {
      const stored = localStorage.getItem('nanopub_profile');
      if (stored) {
        const data = JSON.parse(stored);
        this.profile = data.profile;
        this.credentials = data.credentials;
        console.log('✓ Profile loaded from localStorage');
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
      localStorage.removeItem('nanopub_profile');
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
   */
  async publish(trigContent) {
    await this.ensureWasm();

    if (!this.hasProfile()) {
      throw new Error('Profile not configured. Cannot sign nanopublication.');
    }

    try {
      // Create NpProfile for signing
      const npProfile = new NpProfile(
        this.credentials.privateKey,
        this.profile.orcid,
        this.profile.name
      );

      // Create and sign nanopub
      const nanopub = new Nanopub(trigContent);
      const signedNp = nanopub.sign(npProfile);

      // Publish
      const result = await signedNp.publish(this.options.publishServer);
      
      // Parse result (it's a JSON string)
      const publishInfo = JSON.parse(result);
      
      this.emit('publish', {
        uri: publishInfo.uri || publishInfo.nanopub_uri,
        signedContent: signedNp.to_string()
      });

      return publishInfo;

    } catch (error) {
      console.error('Publish failed:', error);
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
