/**
 * Nanopub Creator - Main Entry Point
 * 
 * A JavaScript library for creating nanopublications from templates.
 * Integrates with the Knowledge Pixels nanopub ecosystem.
 * 
 * UPDATED: Now includes label fetching for human-readable form fields
 */

import { TemplateParser, parseTemplateFromUri } from './core/templateParser.js';
import { FormGenerator } from './core/formGenerator.js';
import { NanopubBuilder } from './core/nanopubBuilder.js';
import { NanopubPublisher } from './core/publisher.js';

export class NanopubCreator {
  constructor(options = {}) {
    this.options = {
      container: null,
      templateUri: null,
      theme: 'default',
      publishServer: 'https://np.petapico.org/',
      validateOnChange: true,
      showHelp: true,
      ...options
    };

    this.template = null;
    this.formGenerator = null;
    this.builder = null;
    this.publisher = null;
    this.formData = {};
    this.listeners = {
      onChange: [],
      onSubmit: [],
      onError: []
    };
  }

  /**
   * Render form from a template URI
   * UPDATED: Now fetches labels for human-readable display
   */
  async renderFromTemplateUri(templateUri, container) {
    try {
      // Parse template WITH labels
      const templateData = await parseTemplateFromUri(templateUri);
      
      // Debug: Log label information
      if (templateData.labels && Object.keys(templateData.labels).length > 0) {
        console.log('✅ Labels loaded:', Object.keys(templateData.labels).length, 'labels');
        console.log('📋 Sample labels:', 
          Object.entries(templateData.labels)
            .slice(0, 3)
            .map(([uri, label]) => `  ${label} (${uri})`)
            .join('\n')
        );
      } else {
        console.warn('⚠️ No labels found in template. Forms will show raw URIs.');
        console.warn('💡 Make sure parseTemplateFromUri() calls parseWithLabels()');
        templateData.labels = {};
      }
      
      return this.renderFromTemplate(templateData, container);
    } catch (error) {
      this.emit('error', { type: 'template-fetch', error });
      throw error;
    }
  }

  /**
   * Render form from a parsed template object
   * UPDATED: Now passes labels to FormGenerator
   */
  renderFromTemplate(template, container) {
    this.template = template;
    this.builder = new NanopubBuilder(template);
    this.publisher = new NanopubPublisher({ server: this.options.publishServer });

    // Initialize form generator WITH LABELS
    this.formGenerator = new FormGenerator(template, {
      validateOnChange: this.options.validateOnChange,
      showHelp: this.options.showHelp,
      theme: this.options.theme,
      labels: template.labels || {},  // ← CRITICAL: Pass labels here
      showUriTooltips: true  // ← NEW: Show URI tooltips on hover
    });

    // Debug: Verify FormGenerator has labels
    console.log('🔍 FormGenerator labels:', 
      this.formGenerator.labels ? 
      `${Object.keys(this.formGenerator.labels).length} labels available` : 
      'NO LABELS ❌'
    );

    // Listen to form changes
    this.formGenerator.onChange((data) => {
      this.formData = data;
      this.emit('change', data);
    });

    // Render form
    const formElement = this.formGenerator.renderForm(container || this.options.container);

    // Attach submit handler
    formElement.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });

    return formElement;
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    try {
      // Validate form
      const validation = this.formGenerator.validate();
      if (!validation.valid) {
        this.emit('error', { type: 'validation', errors: validation.errors });
        return;
      }

      // Build nanopub
      const trigContent = await this.builder.buildFromFormData(
        this.formData,
        {
          creator: this.options.creator,
          creatorName: this.options.creatorName,
          creatorOrcid: this.options.creatorOrcid
        }
      );

      // Emit submit event with TriG content
      this.emit('submit', { trigContent, formData: this.formData });

      // Publish if auto-publish is enabled
      if (this.options.autoPublish) {
        const result = await this.publish(trigContent);
        this.emit('published', result);
      }

      return trigContent;
    } catch (error) {
      this.emit('error', { type: 'submit', error });
      throw error;
    }
  }

  /**
   * Publish a nanopublication
   */
  async publish(trigContent) {
    try {
      const result = await this.publisher.publish(trigContent);
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
    return { ...this.formData };
  }

  /**
   * Set form data programmatically
   */
  setFormData(data) {
    this.formData = { ...this.formData, ...data };
    if (this.formGenerator) {
      this.formGenerator.setFormData(this.formData);
    }
  }

  /**
   * Generate TriG content without publishing
   */
  async generateTriG(metadata = {}) {
    if (!this.builder) {
      throw new Error('No template loaded. Call renderFromTemplate() first.');
    }

    return await this.builder.buildFromFormData(this.formData, metadata);
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
    this.listeners = { onChange: [], onSubmit: [], onError: [] };
  }
}

// Export utility functions
export { 
  TemplateParser, 
  parseTemplateFromUri,
  FormGenerator,
  NanopubBuilder,
  NanopubPublisher
};

// Default export
export default NanopubCreator;
