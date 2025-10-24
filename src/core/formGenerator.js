/**
 * Form Generator for Nanopublication Templates
 * 
 * Generates user-friendly HTML forms from parsed nanopub templates.
 * Supports various field types, validation, and repeatable fields.
 */

export class FormGenerator {
  constructor(template, options = {}) {
    this.template = template;
    this.options = {
      validateOnChange: true,
      showHelp: true,
      theme: 'default',
      ...options
    };
    this.formData = {};
    this.errors = {};
    this.changeListeners = [];
  }

  /**
   * Generate form schema from template
   */
  generateSchema() {
    return {
      title: this.template.label,
      description: this.template.description,
      fields: this.template.placeholders.map(p => this.placeholderToField(p)),
      statements: this.template.statements
    };
  }

  /**
   * Convert placeholder to form field configuration
   */
  placeholderToField(placeholder) {
    const baseField = {
      id: placeholder.id,
      name: placeholder.id,
      label: placeholder.label,
      description: placeholder.description,
      required: placeholder.required,
      validation: placeholder.validation
    };

    // Map placeholder type to HTML input type
    switch (placeholder.type) {
      case 'LiteralPlaceholder':
        return {
          ...baseField,
          type: 'text',
          inputType: 'text',
          maxLength: 200
        };

      case 'LongLiteralPlaceholder':
        return {
          ...baseField,
          type: 'textarea',
          rows: 4,
          maxLength: 5000
        };

      case 'ExternalUriPlaceholder':
      case 'TrustyUriPlaceholder':
        return {
          ...baseField,
          type: 'url',
          inputType: 'url',
          placeholder: 'https://example.org/...'
        };

      case 'RestrictedChoicePlaceholder':
        return {
          ...baseField,
          type: 'select',
          options: placeholder.options,
          placeholder: 'Select an option...'
        };

      case 'ValuePlaceholder':
        return {
          ...baseField,
          type: 'text',
          inputType: 'text'
        };

      case 'LocalResourcePlaceholder':
        return {
          ...baseField,
          type: 'resource',
          inputType: 'text',
          help: 'Will be converted to a local resource URI'
        };

      default:
        return {
          ...baseField,
          type: 'text',
          inputType: 'text'
        };
    }
  }

  /**
   * Render complete form HTML
   */
  renderForm(container) {
    const schema = this.generateSchema();
    
    // Clear container
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    container.innerHTML = '';
    container.className = 'nanopub-creator';

    // Build form HTML
    const formElement = document.createElement('form');
    formElement.className = 'creator-form';
    formElement.noValidate = true;

    // Add header
    const header = this.buildHeader(schema);
    formElement.appendChild(header);

    // Add fields
    schema.fields.forEach(field => {
      const fieldElement = this.buildField(field);
      formElement.appendChild(fieldElement);
    });

    // Add repeatable fields
    this.addRepeatableFields(formElement, schema);

    // Add form actions
    const actions = this.buildActions();
    formElement.appendChild(actions);

    container.appendChild(formElement);

    // Attach event listeners
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
      description.textContent = schema.description;
      header.appendChild(description);
    }

    return header;
  }

  /**
   * Build a form field element
   */
  buildField(field) {
    const fieldWrapper = document.createElement('div');
    fieldWrapper.className = 'form-field';
    fieldWrapper.dataset.fieldId = field.id;

    // Label
    const label = document.createElement('label');
    label.htmlFor = `field-${field.id}`;
    label.textContent = field.label;
    if (field.required) {
      const required = document.createElement('span');
      required.className = 'required-indicator';
      required.textContent = ' *';
      label.appendChild(required);
    }
    fieldWrapper.appendChild(label);

    // Input element
    const input = this.buildInput(field);
    fieldWrapper.appendChild(input);

    // Help text
    if (field.description && this.options.showHelp) {
      const help = document.createElement('span');
      help.className = 'field-help';
      help.textContent = field.description;
      fieldWrapper.appendChild(help);
    }

    // Error message placeholder
    const errorMsg = document.createElement('span');
    errorMsg.className = 'error-message';
    errorMsg.style.display = 'none';
    fieldWrapper.appendChild(errorMsg);

    return fieldWrapper;
  }

  /**
   * Build input element based on field type
   */
  buildInput(field) {
    let input;

    switch (field.type) {
      case 'textarea':
        input = document.createElement('textarea');
        input.rows = field.rows || 4;
        if (field.maxLength) {
          input.maxLength = field.maxLength;
        }
        break;

      case 'select':
        input = document.createElement('select');
        
        // Add placeholder option
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = field.placeholder || 'Select...';
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        input.appendChild(placeholderOption);

        // Add options (will be loaded asynchronously if needed)
        if (field.options) {
          this.loadSelectOptions(input, field.options);
        }
        break;

      default:
        input = document.createElement('input');
        input.type = field.inputType || 'text';
        if (field.placeholder) {
          input.placeholder = field.placeholder;
        }
        if (field.maxLength) {
          input.maxLength = field.maxLength;
        }
    }

    input.id = `field-${field.id}`;
    input.name = field.name;
    input.required = field.required;

    // Add validation attributes
    if (field.validation?.regex) {
      input.pattern = field.validation.regex;
    }

    return input;
  }

  /**
   * Load options for select fields
   */
  async loadSelectOptions(selectElement, optionsConfig) {
    if (optionsConfig.type === 'inline') {
      // Add inline options
      optionsConfig.values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectElement.appendChild(option);
      });
    } else if (optionsConfig.type === 'uri') {
      // Fetch options from URI
      try {
        const options = await this.fetchOptionsFromUri(optionsConfig.source);
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          selectElement.appendChild(option);
        });
      } catch (error) {
        console.error('Failed to load options:', error);
      }
    }
  }

  /**
   * Fetch options from external URI (nanopub)
   */
  async fetchOptionsFromUri(uri) {
    // Fetch the nanopub containing options
    const response = await fetch(uri);
    const content = await response.text();

    // Parse options from nanopub
    // This is a simplified parser - in production, use proper RDF parsing
    const options = [];
    const optionRegex = /<([^>]+)>\s+rdfs:label\s+"([^"]+)"/g;
    let match;

    while ((match = optionRegex.exec(content)) !== null) {
      options.push({
        value: match[1],
        label: match[2]
      });
    }

    return options;
  }

  /**
   * Add repeatable field sections
   */
  addRepeatableFields(formElement, schema) {
    const repeatableStatements = schema.statements.filter(s => s.repeatable);

    repeatableStatements.forEach(statement => {
      const group = this.buildRepeatableGroup(statement, schema);
      formElement.insertBefore(group, formElement.lastChild);
    });
  }

  /**
   * Build repeatable field group
   */
  buildRepeatableGroup(statement, schema) {
    const group = document.createElement('div');
    group.className = 'repeatable-field-group';
    group.dataset.statementId = statement.id;

    const label = document.createElement('h3');
    label.textContent = this.getStatementLabel(statement);
    group.appendChild(label);

    // Container for repeated fields
    const container = document.createElement('div');
    container.className = 'repeatable-fields';
    group.appendChild(container);

    // Add first instance
    const firstField = this.buildRepeatableField(statement, schema, 0);
    container.appendChild(firstField);

    // Add button
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'add-field';
    addButton.textContent = '+ Add Another';
    addButton.onclick = () => {
      const index = container.children.length;
      const newField = this.buildRepeatableField(statement, schema, index);
      container.appendChild(newField);
    };
    group.appendChild(addButton);

    return group;
  }

  /**
   * Build a single repeatable field instance
   */
  buildRepeatableField(statement, schema, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'repeatable-field';

    // Find the placeholder for the object of this statement
    const placeholder = schema.fields.find(f => f.id === statement.object.replace('sub:', ''));
    
    if (placeholder) {
      const field = { ...placeholder };
      field.id = `${field.id}-${index}`;
      field.name = `${field.name}[]`;
      
      const fieldElement = this.buildField(field);
      wrapper.appendChild(fieldElement);

      // Remove button (for index > 0)
      if (index > 0) {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-field';
        removeBtn.textContent = '×';
        removeBtn.onclick = () => wrapper.remove();
        wrapper.appendChild(removeBtn);
      }
    }

    return wrapper;
  }

  /**
   * Build form action buttons
   */
  buildActions() {
    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'btn-secondary';
    previewBtn.textContent = 'Preview';
    previewBtn.onclick = () => this.handlePreview();
    actions.appendChild(previewBtn);

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn-primary';
    submitBtn.textContent = 'Create Nanopublication';
    actions.appendChild(submitBtn);

    return actions;
  }

  /**
   * Attach event listeners to form
   */
  attachEventListeners(formElement) {
    // Form submission
    formElement.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(formElement);
    });

    // Field validation on change
    if (this.options.validateOnChange) {
      formElement.querySelectorAll('input, textarea, select').forEach(input => {
        input.addEventListener('blur', () => {
          this.validateField(input);
        });
      });
    }

    // Track changes
    formElement.addEventListener('change', (e) => {
      this.handleChange(e.target);
    });
  }

  /**
   * Handle form submission
   */
  handleSubmit(formElement) {
    // Collect form data
    const data = this.collectFormData(formElement);

    // Validate all fields
    const isValid = this.validateForm(formElement);

    if (isValid) {
      // Trigger submit callback
      this.changeListeners.forEach(listener => {
        if (listener.event === 'submit') {
          listener.callback(data);
        }
      });
    }
  }

  /**
   * Handle preview
   */
  handlePreview() {
    const data = this.collectFormData();
    
    this.changeListeners.forEach(listener => {
      if (listener.event === 'preview') {
        listener.callback(data);
      }
    });
  }

  /**
   * Handle field change
   */
  handleChange(input) {
    const fieldId = input.closest('.form-field')?.dataset.fieldId;
    
    if (fieldId) {
      this.formData[fieldId] = input.value;
      
      this.changeListeners.forEach(listener => {
        if (listener.event === 'change') {
          listener.callback({ field: fieldId, value: input.value });
        }
      });
    }
  }

  /**
   * Collect all form data
   */
  collectFormData(formElement = null) {
    if (!formElement) {
      return this.formData;
    }

    const data = {};
    const formData = new FormData(formElement);

    for (const [key, value] of formData.entries()) {
      if (key.endsWith('[]')) {
        // Handle array fields
        const baseKey = key.slice(0, -2);
        if (!data[baseKey]) {
          data[baseKey] = [];
        }
        data[baseKey].push(value);
      } else {
        data[key] = value;
      }
    }

    return data;
  }

  /**
   * Validate entire form
   */
  validateForm(formElement) {
    let isValid = true;
    const inputs = formElement.querySelectorAll('input, textarea, select');

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
    const fieldWrapper = input.closest('.form-field');
    if (!fieldWrapper) return true;

    const errorElement = fieldWrapper.querySelector('.error-message');
    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (input.required && !input.value.trim()) {
      isValid = false;
      errorMessage = 'This field is required';
    }

    // Pattern validation
    if (isValid && input.pattern && input.value) {
      const regex = new RegExp(input.pattern);
      if (!regex.test(input.value)) {
        isValid = false;
        errorMessage = 'Please enter a valid value';
      }
    }

    // URL validation
    if (isValid && input.type === 'url' && input.value) {
      try {
        new URL(input.value);
      } catch {
        isValid = false;
        errorMessage = 'Please enter a valid URL';
      }
    }

    // Update UI
    if (isValid) {
      fieldWrapper.classList.remove('error');
      errorElement.style.display = 'none';
      errorElement.textContent = '';
    } else {
      fieldWrapper.classList.add('error');
      errorElement.style.display = 'block';
      errorElement.textContent = errorMessage;
    }

    return isValid;
  }

  /**
   * Get friendly label for statement
   */
  getStatementLabel(statement) {
    // Try to get label from template
    const predicate = statement.predicate.replace('sub:', '');
    return this.template.prefixes[predicate] || predicate;
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    this.changeListeners.push({ event, callback });
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    this.changeListeners = this.changeListeners.filter(
      l => !(l.event === event && l.callback === callback)
    );
  }

  /**
   * Set field value programmatically
   */
  setFieldValue(fieldId, value) {
    this.formData[fieldId] = value;
    
    const input = document.querySelector(`#field-${fieldId}`);
    if (input) {
      input.value = value;
    }
  }

  /**
   * Get field value
   */
  getFieldValue(fieldId) {
    return this.formData[fieldId];
  }

  /**
   * Reset form
   */
  reset() {
    this.formData = {};
    this.errors = {};
  }
}

export default FormGenerator;
