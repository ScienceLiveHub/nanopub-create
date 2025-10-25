/**
 * Main entry point for nanopub-create library
 */

import { TemplateParser } from './core/templateParser.js';
import FormGenerator from './core/formGenerator.js';
import { NanopubBuilder } from './core/nanopubBuilder.js';
import { NanopubPublisher } from './core/publisher.js';

/**
 * Main NanopubCreator class
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
    this.publisher = null;
    this.formData = {};
    this.container = null;

    // Event listeners
    this.listeners = {
      change: [],
      submit: [],
      error: []
    };
  }

  /**
   * Render form from template URI
   */
  async renderFromTemplateUri(templateUri, container) {
    this.container = container;

    try {
      // Parse template
      this.template = await TemplateParser.fetchAndParse(templateUri);

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
        try {
          const trigContent = await this.generateNanopub();
          this.emit('submit', { trigContent, formData: this.formData });
        } catch (error) {
          this.emit('error', { type: 'generation', error });
        }
      });

      // Render the form
      this.formGenerator.renderForm(container);

      // Create builder and publisher
      this.builder = new NanopubBuilder(this.template);
      this.publisher = new NanopubPublisher(this.options.publishServer);

    } catch (error) {
      this.emit('error', { type: 'template', error });
      throw error;
    }
  }

  /**
   * Render form from template object
   */
  async renderFromTemplate(template, container) {
    this.container = container;
    this.template = template;

    try {
      // Create form generator
      this.formGenerator = new FormGenerator(this.template, {
        validateOnChange: this.options.validateOnChange,
        showHelp: this.options.showHelp,
        labels: this.template.labels || {}
      });

      // Set up form change handler
      this.formGenerator.on('change', (data) => {
        this.formData = data;
        this.emit('change', data);
      });

      // Set up form submit handler
      this.formGenerator.on('submit', async (data) => {
        this.formData = data.formData || data;
        try {
          const trigContent = await this.generateNanopub();
          this.emit('submit', { trigContent, formData: this.formData });
        } catch (error) {
          this.emit('error', { type: 'generation', error });
        }
      });

      // Render the form
      this.formGenerator.renderForm(container);

      // Create builder and publisher
      this.builder = new NanopubBuilder(this.template);
      this.publisher = new NanopubPublisher(this.options.publishServer);

    } catch (error) {
      this.emit('error', { type: 'render', error });
      throw error;
    }
  }

  /**
   * Validate current form data
   */
  validate() {
    if (!this.formGenerator) {
      throw new Error('No form rendered. Call renderFromTemplateUri() or renderFromTemplate() first.');
    }

    const validation = this.formGenerator.validate();
    
    if (!validation.isValid) {
      this.emit('error', { 
        type: 'validation', 
        errors: validation.errors 
      });
    }

    return validation;
  }

  /**
   * Generate nanopub from current form data
   */
  async generateNanopub(metadata = {}) {
    if (!this.builder) {
      throw new Error('Builder not initialized. Call renderFromTemplateUri() or renderFromTemplate() first.');
    }

    if (!this.formData || Object.keys(this.formData).length === 0) {
      throw new Error('No form data. Call renderFromTemplateUri() or renderFromTemplate() first.');
    }

    return await this.builder.buildFromFormData(this.formData, metadata);
  }

  /**
   * Publish nanopub to server
   */
  async publishNanopub(trigContent) {
    if (!this.publisher) {
      this.publisher = new NanopubPublisher(this.options.publishServer);
    }

    try {
      const result = await this.publisher.publish(trigContent);
      this.emit('submit', { result, trigContent });
      return result;
    } catch (error) {
      this.emit('error', { type: 'publish', error });
      throw error;
    }
  }

  /**
   * Get current form data
   */
  getFormData() {
    return this.formData;
  }

  /**
   * Set form data programmatically
   */
  setFormData(data) {
    if (this.formGenerator) {
      this.formGenerator.setData(data);
      this.formData = data;
    }
  }

  /**
   * Event listener registration
   */
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  /**
   * Emit events
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Destroy creator instance and clean up
   */
  destroy() {
    if (this.formGenerator) {
      this.formGenerator.destroy();
    }
    this.template = null;
    this.formGenerator = null;
    this.builder = null;
    this.publisher = null;
    this.formData = {};
    this.listeners = { change: [], submit: [], error: [] };
  }
}

// Export utility functions and classes
export { 
  TemplateParser,
  FormGenerator,
  NanopubBuilder,
  NanopubPublisher
};

// Default export
export default NanopubCreator;
