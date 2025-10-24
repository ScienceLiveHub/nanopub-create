/**
 * Form Generator for Nanopublication Templates with Full Label Support
 * 
 * This version properly displays labels for subjects, predicates, and objects
 * by utilizing the labels fetched during parsing.
 */

export class FormGenerator {
  constructor(template, options = {}) {
    this.template = template;
    this.options = {
      validateOnChange: true,
      showHelp: true,
      showUriTooltips: true,
      theme: 'default',
      ...options
    };
    
    this.labels = options.labels || template.labels || {};
    this.formData = {};
    this.errors = {};
    this.eventListeners = {
      change: [],
      submit: [],
      preview: []
    };
    this.repetitionCounts = {};
    this.formElement = null;
  }

  /**
   * Get human-readable label for a URI
   */
  getLabel(uri) {
    if (!uri) return '';
    
    if (uri.startsWith('sub:')) {
      const placeholderId = uri.replace('sub:', '');
      const placeholder = this.template.placeholders?.find(p => p.id === placeholderId);
      if (placeholder && placeholder.label) {
        return placeholder.label;
      }
      return placeholderId;
    }
    
    if (this.labels[uri]) {
      const label = this.labels[uri];
      if (typeof label === 'string') {
        return label;
      } else if (typeof label === 'object') {
        return label.label || label['@value'] || label.value || this.parseUriLabel(uri);
      }
    }
    
    return this.parseUriLabel(uri);
  }

  /**
   * Parse a human-readable label from a URI
   */
  parseUriLabel(uri) {
    if (!uri) return '';
    
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
      return 'Type';
    }
    
    const parts = uri.split(/[#\/]/);
    let label = parts[parts.length - 1];
    
    if (!label && parts.length > 1) {
      label = parts[parts.length - 2];
    }
    
    if (!label) return uri;
    
    label = label.replace(/([a-z])([A-Z])/g, '$1 $2');
    label = label.replace(/[_-]/g, ' ');
    label = label.replace(/^has\s*/i, '');
    label = label.replace(/^is\s*/i, '');
    label = label.trim().replace(/\s+/g, ' ');
    
    label = label.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return label;
  }

  /**
   * Create a label element with optional URI tooltip
   */
  createLabelElement(text, uri = null) {
    const label = document.createElement('label');
    label.textContent = text;
    
    if (uri && this.options.showUriTooltips) {
      label.title = `URI: ${uri}`;
      label.className = 'has-tooltip';
      
      const icon = document.createElement('span');
      icon.className = 'uri-info-icon';
      icon.textContent = 'ⓘ';
      icon.title = uri;
      label.appendChild(document.createTextNode(' '));
      label.appendChild(icon);
    }
    
    return label;
  }

  /**
   * Generate form schema from template
   */
  generateSchema() {
    return {
      title: this.template.label || 'Create Nanopublication',
      description: this.template.description,
      fields: this.getNonRepeatablePlaceholders(),
      statements: this.template.statements || [],
      labels: this.labels
    };
  }

  /**
   * Get placeholders that are not part of repeatable statements
   */
  getNonRepeatablePlaceholders() {
    const repeatablePlaceholderIds = this.template.repeatablePlaceholderIds || [];
    return (this.template.placeholders || [])
      .filter(p => !repeatablePlaceholderIds.includes(p.id))
      .map(p => this.placeholderToField(p));
  }

  /**
   * Convert placeholder to form field configuration
   */
  placeholderToField(placeholder) {
    const baseField = {
      id: placeholder.id,
      name: placeholder.id,
      label: placeholder.label || this.getLabel(`sub:${placeholder.id}`),
      description: placeholder.description,
      required: placeholder.required !== false,
      validation: placeholder.validation || {}
    };

    switch (placeholder.type) {
      case 'LiteralPlaceholder':
        return { ...baseField, type: 'text', inputType: 'text', maxLength: 200 };
      
      case 'LongLiteralPlaceholder':
        return { ...baseField, type: 'textarea', rows: 4, maxLength: 5000 };
      
      case 'ExternalUriPlaceholder':
      case 'TrustyUriPlaceholder':
        return { ...baseField, type: 'url', inputType: 'url', placeholder: 'https://example.org/...' };
      
      case 'RestrictedChoicePlaceholder':
        return { ...baseField, type: 'select', options: placeholder.options, placeholder: 'Select an option...' };
      
      case 'ValuePlaceholder':
        return { ...baseField, type: 'text', inputType: 'text' };
      
      case 'LocalResourcePlaceholder':
        return { ...baseField, type: 'resource', inputType: 'text', help: 'Will be converted to a local resource URI' };
      
      default:
        return { ...baseField, type: 'text', inputType: 'text' };
    }
  }

  /**
   * Render complete form HTML
   */
  renderForm(container) {
    const schema = this.generateSchema();
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (!container) {
      throw new Error('Container element not found');
    }
    
    container.innerHTML = '';
    container.className = 'nanopub-creator enhanced';

    const formElement = document.createElement('form');
    formElement.className = 'creator-form';
    formElement.noValidate = true;
    this.formElement = formElement;

    // Add header
    formElement.appendChild(this.buildHeader(schema));

    // Add regular fields
    const fieldsSection = document.createElement('div');
    fieldsSection.className = 'form-fields';
    
    schema.fields.forEach(field => {
      fieldsSection.appendChild(this.buildField(field));
    });
    
    if (schema.fields.length > 0) {
      formElement.appendChild(fieldsSection);
    }

    // Add statements section
    if (schema.statements && schema.statements.length > 0) {
      formElement.appendChild(this.buildStatementsSection(schema.statements));
    }

    // Add form actions
    formElement.appendChild(this.buildActions());

    container.appendChild(formElement);
    this.attachEventListeners(formElement);

    return formElement;
  }

  /**
   * Build form header
   */
  buildHeader(schema) {
    const header = document.createElement('div');
    header.className = 'creator-header';

    const title = document.createElement('h2');
    title.textContent = schema.title;
    header.appendChild(title);

    if (schema.description) {
      const description = document.createElement('p');
      description.className = 'creator-description';
      description.textContent = schema.description;
      header.appendChild(description);
    }

    return header;
  }

  /**
   * Build statements section
   */
  buildStatementsSection(statements) {
    const section = document.createElement('div');
    section.className = 'statements-section';

    const heading = document.createElement('h3');
    heading.textContent = 'Statements';
    section.appendChild(heading);

    // Group statements
    const repeatableStatements = statements.filter(s => s.repeatable);
    const nonRepeatableStatements = statements.filter(s => !s.repeatable);

    // Render non-repeatable statements
    nonRepeatableStatements.forEach(statement => {
      section.appendChild(this.buildStatementField(statement));
    });

    // Render repeatable statement groups
    const groupedRepeatable = this.groupRepeatableStatements(repeatableStatements);
    Object.entries(groupedRepeatable).forEach(([groupId, stmts]) => {
      section.appendChild(this.buildRepeatableGroup(groupId, stmts));
    });

    return section;
  }

  /**
   * Build statement field
   */
  buildStatementField(statement) {
    const wrapper = document.createElement('div');
    wrapper.className = 'statement-field';

    // Get predicate label
    const predicateLabel = statement.predicateIsPlaceholder
      ? statement.predicatePlaceholder.label || this.getLabel(statement.predicate)
      : this.getLabel(statement.predicate);

    const label = this.createLabelElement(predicateLabel, statement.predicate);
    wrapper.appendChild(label);

    // Build input based on object type
    if (statement.objectIsPlaceholder) {
      const field = this.placeholderToField(statement.objectPlaceholder);
      const input = this.buildInput(field);
      wrapper.appendChild(input);

      if (field.description && this.options.showHelp) {
        const help = document.createElement('small');
        help.className = 'field-help';
        help.textContent = field.description;
        wrapper.appendChild(help);
      }
    } else {
      // Fixed object - display as read-only
      const fixedValue = document.createElement('div');
      fixedValue.className = 'fixed-object';
      fixedValue.textContent = this.getLabel(statement.object);
      fixedValue.title = statement.object;
      wrapper.appendChild(fixedValue);
    }

    // Error div
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.display = 'none';
    wrapper.appendChild(errorDiv);

    return wrapper;
  }

  /**
   * Group repeatable statements
   */
  groupRepeatableStatements(statements) {
    const groups = {};
    
    statements.forEach(statement => {
      const groupId = statement.grouped ? statement.id : 'default';
      if (!groups[groupId]) {
        groups[groupId] = [];
      }
      groups[groupId].push(statement);
    });

    return groups;
  }

  /**
   * Build repeatable group
   */
  buildRepeatableGroup(groupId, statements) {
    const group = document.createElement('div');
    group.className = 'repeatable-group';
    group.dataset.groupId = groupId;

    if (!this.repetitionCounts[groupId]) {
      this.repetitionCounts[groupId] = 0;
    }

    // Header
    const header = document.createElement('div');
    header.className = 'repeatable-header';

    const title = document.createElement('h4');
    title.textContent = statements[0].predicateIsPlaceholder
      ? statements[0].predicatePlaceholder.label || this.getLabel(statements[0].predicate)
      : this.getLabel(statements[0].predicate);
    header.appendChild(title);

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn-add-field';
    addButton.textContent = '+ Add';
    addButton.onclick = () => this.addRepeatableField(groupId, statements, fieldsContainer);
    header.appendChild(addButton);

    group.appendChild(header);

    // Fields container
    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'repeatable-fields';
    group.appendChild(fieldsContainer);

    // Add initial field
    this.addRepeatableField(groupId, statements, fieldsContainer);

    return group;
  }

  /**
   * Add repeatable field
   */
  addRepeatableField(groupId, statements, container) {
    const index = this.repetitionCounts[groupId]++;
    
    const item = document.createElement('div');
    item.className = 'repeatable-field-item';
    item.dataset.index = index;

    statements.forEach((statement, stmtIndex) => {
      if (statement.objectIsPlaceholder) {
        const field = this.placeholderToField(statement.objectPlaceholder);
        field.name = `${field.id}_${index}`;
        field.id = `${field.id}_${index}`;
        
        const input = this.buildInput(field);
        input.className = 'repeatable-input';
        item.appendChild(input);
      }
    });

    // Remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-field';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => {
      item.remove();
      this.triggerChange();
    };
    item.appendChild(removeBtn);

    container.appendChild(item);
    this.triggerChange();
  }

  /**
   * Build a single form field
   */
  buildField(field) {
    const wrapper = document.createElement('div');
    wrapper.className = `form-field ${field.required ? 'required' : ''}`;

    const label = this.createLabelElement(field.label, field.uri);
    wrapper.appendChild(label);

    const input = this.buildInput(field);
    wrapper.appendChild(input);

    if (field.description && this.options.showHelp) {
      const help = document.createElement('small');
      help.className = 'field-help';
      help.textContent = field.description;
      wrapper.appendChild(help);
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.style.display = 'none';
    wrapper.appendChild(errorDiv);

    return wrapper;
  }

  /**
   * Build input element
   */
  buildInput(field) {
    let input;

    if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = field.rows || 4;
    } else if (field.type === 'select') {
      input = document.createElement('select');
      
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = field.placeholder || 'Select...';
      input.appendChild(defaultOption);

      if (field.options) {
        if (field.options.type === 'uri') {
          this.loadSelectOptions(input, field.options.source);
        } else if (field.options.type === 'inline' && field.options.values) {
          field.options.values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = this.getLabel(value);
            input.appendChild(option);
          });
        }
      }
    } else {
      input = document.createElement('input');
      input.type = field.inputType || field.type || 'text';
      if (field.placeholder) {
        input.placeholder = field.placeholder;
      }
    }

    input.name = field.name || field.id;
    input.id = field.id;
    input.className = 'form-input';
    
    if (field.required) {
      input.required = true;
    }

    if (field.validation?.regex) {
      input.dataset.validationRegex = field.validation.regex;
    }

    if (field.maxLength) {
      input.maxLength = field.maxLength;
    }

    // Add change listener
    input.addEventListener('input', () => this.triggerChange());

    return input;
  }

  /**
   * Load select options from URI
   */
  async loadSelectOptions(selectElement, sourceUri) {
    selectElement.disabled = true;
    
    try {
      const response = await fetch(`${sourceUri}.trig`);
      if (!response.ok) throw new Error('Failed to fetch options');
      
      const content = await response.text();
      const optionPattern = /<([^>]+)>\s+rdfs:label\s+"([^"]+)"/g;
      let match;
      
      while ((match = optionPattern.exec(content)) !== null) {
        const uri = match[1];
        const label = match[2];
        
        const option = document.createElement('option');
        option.value = uri;
        option.textContent = label;
        selectElement.appendChild(option);
      }
      
      selectElement.disabled = false;
    } catch (error) {
      console.error('Error loading select options:', error);
      selectElement.disabled = false;
      
      const errorOption = document.createElement('option');
      errorOption.textContent = 'Error loading options';
      errorOption.disabled = true;
      selectElement.appendChild(errorOption);
    }
  }

  /**
   * Build form actions
   */
  buildActions() {
    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'btn btn-primary';
    submitButton.textContent = 'Create Nanopublication';
    actions.appendChild(submitButton);

    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.className = 'btn btn-secondary';
    previewButton.textContent = 'Preview';
    previewButton.onclick = () => this.showPreview();
    actions.appendChild(previewButton);

    return actions;
  }

  /**
   * Get form data
   */
  getFormData() {
    if (!this.formElement) return {};

    const formData = {};
    const inputs = this.formElement.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      if (input.name && input.value) {
        const baseName = input.name.replace(/_\d+$/, '');
        
        if (input.name !== baseName) {
          if (!formData[baseName]) {
            formData[baseName] = [];
          }
          formData[baseName].push(input.value);
        } else {
          formData[input.name] = input.value;
        }
      }
    });

    return formData;
  }

  /**
   * Set form data programmatically
   */
  setFormData(data) {
    if (!this.formElement) return;

    Object.entries(data).forEach(([key, value]) => {
      const input = this.formElement.querySelector(`[name="${key}"]`);
      if (input) {
        if (Array.isArray(value)) {
          input.value = value[0] || '';
        } else {
          input.value = value;
        }
      }
    });

    this.triggerChange();
  }

  /**
   * Trigger change event
   */
  triggerChange() {
    const formData = this.getFormData();
    this.trigger('change', formData);
  }

  /**
   * Register onChange callback
   */
  onChange(callback) {
    this.on('change', callback);
  }

  /**
   * Show preview
   */
  showPreview() {
    const formData = this.getFormData();
    const preview = this.generatePreviewWithLabels(formData);
    this.trigger('preview', { formData, preview });
    console.log('Preview:', preview);
  }

  /**
   * Generate preview with labels
   */
  generatePreviewWithLabels(formData) {
    const preview = {
      statements: [],
      metadata: {
        template: this.template.label,
        templateUri: this.template.uri
      }
    };
    
    if (!this.template.statements) return preview;
    
    this.template.statements.forEach(statement => {
      const subjectLabel = this.getLabel(statement.subject);
      const predicateLabel = this.getLabel(statement.predicate);
      
      let objectLabel, objectValue;
      
      if (statement.object.startsWith('sub:')) {
        const placeholderId = statement.object.replace('sub:', '');
        objectValue = formData[placeholderId];
        
        if (objectValue) {
          objectLabel = objectValue.startsWith('http') ? this.getLabel(objectValue) : objectValue;
        } else {
          objectLabel = '(not provided)';
          objectValue = null;
        }
      } else if (statement.object.startsWith('http')) {
        objectValue = statement.object;
        objectLabel = this.getLabel(statement.object);
      } else {
        objectValue = statement.object;
        objectLabel = statement.object;
      }
      
      preview.statements.push({
        subject: { label: subjectLabel, uri: statement.subject },
        predicate: { label: predicateLabel, uri: statement.predicate },
        object: { label: objectLabel, value: objectValue, uri: statement.object.startsWith('http') ? statement.object : null }
      });
    });
    
    return preview;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners(formElement) {
    formElement.addEventListener('submit', (e) => {
      e.preventDefault();
      
      if (this.validate()) {
        const formData = this.getFormData();
        this.trigger('submit', { formData });
      }
    });

    if (this.options.validateOnChange) {
      const inputs = formElement.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('blur', () => this.validateField(input));
      });
    }
  }

  /**
   * Validate entire form
   */
  validate() {
    if (!this.formElement) return false;

    let isValid = true;
    const inputs = this.formElement.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  /**
   * Validate a single field
   */
  validateField(input) {
    const fieldWrapper = input.closest('.form-field') || input.closest('.statement-field');
    if (!fieldWrapper) return true;

    const errorDiv = fieldWrapper.querySelector('.field-error');
    let errorMessage = '';

    if (input.required && !input.value.trim()) {
      errorMessage = 'This field is required';
    }

    if (input.dataset.validationRegex && input.value) {
      const regex = new RegExp(input.dataset.validationRegex);
      if (!regex.test(input.value)) {
        errorMessage = 'Invalid format';
      }
    }

    if (input.type === 'url' && input.value) {
      try {
        new URL(input.value);
      } catch {
        errorMessage = 'Please enter a valid URL';
      }
    }

    if (errorMessage) {
      if (errorDiv) {
        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
      }
      input.classList.add('invalid');
      return false;
    } else {
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }
      input.classList.remove('invalid');
      return true;
    }
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }

  /**
   * Trigger event
   */
  trigger(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Destroy and cleanup
   */
  destroy() {
    this.formElement = null;
    this.eventListeners = { change: [], submit: [], preview: [] };
    this.formData = {};
  }
}

export default FormGenerator;
