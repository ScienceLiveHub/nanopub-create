/**
 * Form Generator for Nanopublication Templates
 * 
 * Generates user-friendly HTML forms from parsed nanopub templates.
 * Supports various field types, validation, and repeatable fields with variable predicates.
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
    this.eventListeners = {
      change: [],
      submit: [],
      preview: []
    };
    this.repetitionCounts = {}; // Track repetitions for each repeatable statement
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
   * Generate form schema from template
   */
  generateSchema() {
    return {
      title: this.template.label,
      description: this.template.description,
      fields: this.getNonRepeatablePlaceholders(),
      statements: this.template.statements
    };
  }

  /**
   * Get placeholders that are not part of repeatable statements
   */
  getNonRepeatablePlaceholders() {
    const repeatablePlaceholderIds = this.template.repeatablePlaceholderIds || [];
    return this.template.placeholders
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

    // Add regular fields
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
      description.className = 'creator-description';
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

    // Description/help text
    if (field.description) {
      const help = document.createElement('small');
      help.className = 'field-help';
      help.textContent = field.description;
      fieldWrapper.appendChild(help);
    }

    // Input element
    let input;
    if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = field.rows || 4;
    } else if (field.type === 'select') {
      input = document.createElement('select');
      input.id = `field-${field.id}`;
      input.name = field.name;
      
      // Add placeholder option
      const placeholderOption = document.createElement('option');
      placeholderOption.value = '';
      placeholderOption.textContent = field.placeholder || 'Select...';
      placeholderOption.disabled = true;
      placeholderOption.selected = true;
      input.appendChild(placeholderOption);
      
      // Options will be loaded asynchronously
      if (field.options) {
        this.populateSelectOptions(input, field.options);
      }
    } else {
      input = document.createElement('input');
      input.type = field.inputType || 'text';
      if (field.placeholder) {
        input.placeholder = field.placeholder;
      }
    }

    input.id = `field-${field.id}`;
    input.name = field.name;
    input.required = field.required;
    input.className = 'form-input';

    if (field.maxLength) {
      input.maxLength = field.maxLength;
    }

    fieldWrapper.appendChild(input);

    // Validation feedback
    const feedback = document.createElement('div');
    feedback.className = 'field-feedback';
    fieldWrapper.appendChild(feedback);

    return fieldWrapper;
  }

  /**
   * Populate select dropdown options
   */
  async populateSelectOptions(selectElement, optionsConfig) {
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
    try {
      // Fetch the nanopub containing options
      const response = await fetch(uri);
      const content = await response.text();

      // Parse options from nanopub (simplified TriG parser)
      const options = [];
      
      // Match patterns like:
      // <http://purl.org/spar/cito/cites> rdfs:label "cites"
      const optionRegex = /<([^>]+)>\s+rdfs:label\s+"([^"]+)"/g;
      let match;

      while ((match = optionRegex.exec(content)) !== null) {
        options.push({
          value: match[1],
          label: match[2]
        });
      }

      return options;
    } catch (error) {
      console.error('Failed to fetch options from', uri, error);
      return [];
    }
  }

  /**
   * Add repeatable field sections
   */
  addRepeatableFields(formElement, schema) {
    const repeatableStatements = schema.statements.filter(s => s.repeatable);

    repeatableStatements.forEach(statement => {
      const group = this.buildRepeatableGroup(statement);
      formElement.insertBefore(group, formElement.lastChild);
    });
  }

  /**
   * Build repeatable field group (FIXED for variable predicates)
   */
  buildRepeatableGroup(statement) {
    const group = document.createElement('div');
    group.className = 'repeatable-field-group';
    group.dataset.statementId = statement.id;

    const label = document.createElement('h3');
    label.textContent = this.getStatementLabel(statement);
    group.appendChild(label);

    // Container for repeated fields
    const container = document.createElement('div');
    container.className = 'repetitions-container';
    group.appendChild(container);

    // Initialize repetition count
    this.repetitionCounts[statement.id] = 0;

    // Add first repetition
    const firstRepetition = this.buildRepetition(statement, 0);
    container.appendChild(firstRepetition);
    this.repetitionCounts[statement.id] = 1;

    // Add button
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'btn-add-repetition';
    addButton.textContent = '+ Add Another Citation';
    addButton.onclick = () => this.addRepetition(statement, container);
    group.appendChild(addButton);

    return group;
  }

  /**
   * Build single repetition row (FIXED for variable predicates)
   */
  buildRepetition(statement, index) {
    const repetition = document.createElement('div');
    repetition.className = 'repetition-row';
    repetition.dataset.index = index;

    // CRITICAL: Check if predicate is a placeholder
    if (statement.predicateIsPlaceholder) {
      // Build field for predicate (dropdown)
      const predicateField = this.placeholderToField(statement.predicatePlaceholder);
      predicateField.name = `${statement.id}_${index}_predicate`;
      const predicateElement = this.buildField(predicateField);
      predicateElement.classList.add('predicate-field');
      repetition.appendChild(predicateElement);
    }

    // Build field for object
    if (statement.objectIsPlaceholder) {
      const objectField = this.placeholderToField(statement.objectPlaceholder);
      objectField.name = `${statement.id}_${index}_object`;
      const objectElement = this.buildField(objectField);
      objectElement.classList.add('object-field');
      repetition.appendChild(objectElement);
    }

    // Add remove button (except for first repetition)
    if (index > 0) {
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'btn-remove-repetition';
      removeButton.textContent = '✕';
      removeButton.title = 'Remove this citation';
      removeButton.onclick = () => this.removeRepetition(repetition, statement);
      repetition.appendChild(removeButton);
    }

    return repetition;
  }

  /**
   * Add a new repetition
   */
  addRepetition(statement, container) {
    const index = this.repetitionCounts[statement.id];
    const newRepetition = this.buildRepetition(statement, index);
    container.appendChild(newRepetition);
    this.repetitionCounts[statement.id]++;

    // Trigger change event
    this.trigger('change', {
      action: 'add-repetition',
      statement: statement.id,
      index
    });
  }

  /**
   * Remove a repetition
   */
  removeRepetition(repetitionElement, statement) {
    const index = parseInt(repetitionElement.dataset.index);
    repetitionElement.remove();
    this.repetitionCounts[statement.id]--;

    // Trigger change event
    this.trigger('change', {
      action: 'remove-repetition',
      statement: statement.id,
      index
    });
  }

  /**
   * Get label for statement
   */
  getStatementLabel(statement) {
    if (statement.predicateIsPlaceholder && statement.objectIsPlaceholder) {
      return 'Citations';
    }
    if (statement.objectIsPlaceholder) {
      return statement.objectPlaceholder.label;
    }
    return 'Related items';
  }

  /**
   * Build form actions (buttons)
   */
  buildActions() {
    const actions = document.createElement('div');
    actions.className = 'form-actions';

    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.className = 'btn btn-secondary';
    previewButton.textContent = 'Preview';
    previewButton.onclick = () => this.handlePreview();
    actions.appendChild(previewButton);

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'btn btn-primary';
    submitButton.textContent = 'Create Nanopublication';
    actions.appendChild(submitButton);

    return actions;
  }

  /**
   * Attach event listeners to form
   */
  attachEventListeners(form) {
    // Form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Field changes
    form.addEventListener('input', (e) => {
      if (e.target.classList.contains('form-input')) {
        this.handleFieldChange(e.target);
      }
    });

    form.addEventListener('change', (e) => {
      if (e.target.classList.contains('form-input')) {
        this.handleFieldChange(e.target);
      }
    });
  }

  /**
   * Handle field change
   */
  handleFieldChange(field) {
    const fieldId = field.name;
    const value = field.value;

    // Update form data
    this.formData[fieldId] = value;

    // Validate if enabled
    if (this.options.validateOnChange) {
      this.validateField(field);
    }

    // Trigger change event
    this.trigger('change', {
      field: fieldId,
      value
    });
  }

  /**
   * Validate individual field
   */
  validateField(field) {
    const fieldWrapper = field.closest('.form-field');
    const feedback = fieldWrapper.querySelector('.field-feedback');
    
    let isValid = true;
    let errorMessage = '';

    // Required validation
    if (field.required && !field.value.trim()) {
      isValid = false;
      errorMessage = 'This field is required';
    }

    // Type-specific validation
    if (field.type === 'url' && field.value) {
      try {
        new URL(field.value);
      } catch {
        isValid = false;
        errorMessage = 'Please enter a valid URL';
      }
    }

    // Update UI
    if (isValid) {
      fieldWrapper.classList.remove('has-error');
      feedback.textContent = '';
    } else {
      fieldWrapper.classList.add('has-error');
      feedback.textContent = errorMessage;
    }

    return isValid;
  }

  /**
   * Handle preview
   */
  handlePreview() {
    const data = this.collectFormData();
    this.trigger('preview', data);
  }

  /**
   * Handle form submission
   */
  handleSubmit() {
    const data = this.collectFormData();
    
    // Validate all fields
    const form = document.querySelector('.creator-form');
    const inputs = form.querySelectorAll('.form-input');
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    if (isValid) {
      this.trigger('submit', data);
    }
  }

  /**
   * Collect all form data (FIXED for variable predicates)
   */
  collectFormData() {
    const data = {
      fields: {},
      repetitions: {}
    };

    // Collect regular fields
    const form = document.querySelector('.creator-form');
    const regularFields = form.querySelectorAll('.form-field:not(.repetition-row .form-field)');
    
    regularFields.forEach(fieldWrapper => {
      const input = fieldWrapper.querySelector('.form-input');
      if (input && input.name) {
        data.fields[input.name] = input.value;
      }
    });

    // Collect repeatable fields
    const repetitionGroups = form.querySelectorAll('.repeatable-field-group');
    
    repetitionGroups.forEach(group => {
      const statementId = group.dataset.statementId;
      const repetitions = group.querySelectorAll('.repetition-row');
      
      data.repetitions[statementId] = [];
      
      repetitions.forEach(rep => {
        const repData = {};
        
        // Get predicate (if it's a placeholder)
        const predicateInput = rep.querySelector('.predicate-field .form-input');
        if (predicateInput) {
          repData.predicate = predicateInput.value;
        }
        
        // Get object
        const objectInput = rep.querySelector('.object-field .form-input');
        if (objectInput) {
          repData.object = objectInput.value;
        }
        
        data.repetitions[statementId].push(repData);
      });
    });

    return data;
  }

  /**
   * Set field value programmatically
   */
  setFieldValue(fieldId, value) {
    const input = document.querySelector(`[name="${fieldId}"]`);
    if (input) {
      input.value = value;
      this.formData[fieldId] = value;
      this.trigger('change', { field: fieldId, value });
    }
  }

  /**
   * Get field value
   */
  getFieldValue(fieldId) {
    return this.formData[fieldId] || '';
  }

  /**
   * Reset form
   */
  reset() {
    const form = document.querySelector('.creator-form');
    if (form) {
      form.reset();
      this.formData = {};
      this.errors = {};
      this.repetitionCounts = {};
    }
  }

  /**
   * Convenience method for onChange event
   */
  onChange(callback) {
    this.on('change', callback);
  }

  /**
   * Set form data programmatically
   */
  setFormData(data) {
    this.formData = { ...this.formData, ...data };
    
    // Update form fields
    Object.entries(data).forEach(([fieldId, value]) => {
      const input = document.querySelector(`[name="${fieldId}"]`);
      if (input) {
        input.value = value;
      }
    });
  }

  /**
   * Validate all form fields
   */
  validate() {
    const form = document.querySelector('.creator-form');
    if (!form) {
      return { valid: false, errors: ['Form not found'] };
    }

    const inputs = form.querySelectorAll('.form-input');
    const errors = [];
    let isValid = true;

    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
        const fieldWrapper = input.closest('.form-field');
        const label = fieldWrapper?.querySelector('label')?.textContent || input.name;
        const feedback = fieldWrapper?.querySelector('.field-feedback')?.textContent;
        if (feedback) {
          errors.push(`${label}: ${feedback}`);
        }
      }
    });

    return { valid: isValid, errors };
  }

  /**
   * Destroy form generator and clean up
   */
  destroy() {
    const container = document.querySelector('.nanopub-creator');
    if (container) {
      container.innerHTML = '';
    }
    this.formData = {};
    this.errors = {};
    this.eventListeners = { change: [], submit: [], preview: [] };
  }
}
