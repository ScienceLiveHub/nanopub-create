/**
 * Enhanced Form Generator with user-friendly style Rendering
 * Properly displays placeholders with human-readable labels and appropriate field types
 */

export class FormGenerator {
  constructor(template, options = {}) {
    this.template = template;
    this.options = {
      validateOnChange: true,
      showHelp: true,
      showUriTooltips: true,
      readOnly: false,
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
    this.formElement = null;
  }

  /**
   * Get human-readable label for a URI or placeholder
   */
  getLabel(uri) {
    if (!uri) return '';
    
    // Check if it's a placeholder reference
    if (uri.startsWith('sub:')) {
      const placeholderId = uri.replace('sub:', '');
      const placeholder = this.template.placeholders?.find(p => p.id === placeholderId);
      if (placeholder && placeholder.label) {
        return placeholder.label;
      }
      return placeholderId;
    }
    
    // Check labels object
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
    
    // Special RDF predicates
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') return 'Type';
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#subject') return 'Subject';
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate') return 'Predicate';
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object') return 'Object';
    
    const parts = uri.split(/[#\/]/);
    let label = parts[parts.length - 1];
    
    if (!label && parts.length > 1) {
      label = parts[parts.length - 2];
    }
    
    if (!label) return uri;
    
    // Convert camelCase to Title Case
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
  createLabelElement(text, uri = null, required = false) {
    const label = document.createElement('label');
    label.textContent = text;
    
    if (required) {
      const requiredMark = document.createElement('span');
      requiredMark.className = 'required-mark';
      requiredMark.textContent = ' *';
      label.appendChild(requiredMark);
    }
    
    if (uri && this.options.showUriTooltips) {
      label.title = `URI: ${uri}`;
      label.className = 'has-tooltip';
    }
    
    return label;
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

    // Add regular placeholder fields (not used in statements)
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

    // Add form controls
    formElement.appendChild(this.buildFormControls());

    container.appendChild(formElement);
    
    // Set up event listeners
    this.setupEventListeners();
    
    return formElement;
  }

  /**
   * Generate form schema from template
   */
  generateSchema() {
    return {
      title: this.template.label || 'Create Nanopublication',
      description: this.template.description,
      fields: this.getNonStatementPlaceholders(),
      statements: this.template.statements || [],
      labels: this.labels
    };
  }

  /**
   * Get placeholders that should be rendered as standalone fields
   * Excludes placeholders that are only used in statements
   */
  getNonStatementPlaceholders() {
    const usedInStatements = new Set();
    
    (this.template.statements || []).forEach(stmt => {
      // Collect all placeholder references in statements
      if (stmt.subject && stmt.subject.startsWith('sub:')) {
        usedInStatements.add(stmt.subject.replace('sub:', ''));
      }
      if (stmt.predicate && stmt.predicate.startsWith('sub:')) {
        usedInStatements.add(stmt.predicate.replace('sub:', ''));
      }
      if (stmt.object && stmt.object.startsWith('sub:')) {
        usedInStatements.add(stmt.object.replace('sub:', ''));
      }
    });
    
    // Return placeholders NOT used in statements as their subject
    // Subject placeholders are typically shown in statements, not as separate fields
    return (this.template.placeholders || [])
      .filter(p => {
        // Include only placeholders that are:
        // 1. Not the subject of any statement
        // 2. OR explicitly meant to be standalone (like IntroducedResource, AutoEscapeUriPlaceholder)
        const isSubject = this.template.statements?.some(s => s.subject === `sub:${p.id}`);
        const isStandaloneType = ['IntroducedResource', 'AutoEscapeUriPlaceholder', 'LocalResource'].includes(p.type);
        return !isSubject || isStandaloneType;
      })
      .map(p => this.placeholderToField(p));
  }

  /**
   * Convert placeholder to form field configuration
   */
  placeholderToField(placeholder) {
    return {
      id: placeholder.id,
      name: placeholder.id,
      label: placeholder.label || this.getLabel(`sub:${placeholder.id}`),
      type: placeholder.type,
      required: placeholder.required !== false,
      placeholder: placeholder,
      description: placeholder.description
    };
  }

  /**
   * Build form header
   */
  buildHeader(schema) {
    const header = document.createElement('div');
    header.className = 'form-header';
    
    const title = document.createElement('h2');
    title.textContent = schema.title;
    header.appendChild(title);
    
    if (schema.description) {
      const desc = document.createElement('div');
      desc.className = 'form-description';
      desc.innerHTML = schema.description; // Allow HTML in description
      header.appendChild(desc);
    }
    
    return header;
  }

  /**
   * Build form field (for regular placeholders)
   */
  buildField(field) {
    const fieldElement = document.createElement('div');
    fieldElement.className = 'form-field';
    fieldElement.dataset.placeholderId = field.id;
    
    const label = this.createLabelElement(field.label, `sub:${field.id}`, field.required);
    
    const input = this.createInputForPlaceholder(field.placeholder, 0);
    input.name = field.name;
    input.id = `field-${field.id}`;
    if (field.required) {
      input.required = true;
    }
    
    fieldElement.appendChild(label);
    
    // Add description if available
    if (field.description) {
      const desc = document.createElement('div');
      desc.className = 'field-description';
      desc.textContent = field.description;
      fieldElement.appendChild(desc);
    }
    
    fieldElement.appendChild(input);
    
    return fieldElement;
  }

  /**
   * Build statements section
   */
  buildStatementsSection(statements) {
    const section = document.createElement('div');
    section.className = 'statements-section';
    
    const header = document.createElement('h3');
    header.textContent = 'Statements';
    header.className = 'section-header';
    section.appendChild(header);
    
    const statementsContainer = document.createElement('div');
    statementsContainer.className = 'statements-container';
    
    statements.forEach(statement => {
      const statementElement = this.buildStatement(statement);
      statementsContainer.appendChild(statementElement);
    });
    
    section.appendChild(statementsContainer);
    return section;
  }

  /**
   * Build a statement
   */
  buildStatement(statement) {
    const container = document.createElement('div');
    container.className = 'nanopub-statement';
    container.dataset.statementId = statement.id;
    
    if (statement.optional) {
      container.classList.add('nanopub-optional');
    }
    
    // Create statement field
    const field = this.buildStatementField(statement, 0);
    container.appendChild(field);
    
    // If repeatable, add controls
    if (statement.repeatable && !this.options.readOnly) {
      const controls = document.createElement('div');
      controls.className = 'repetition-controls';
      
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn-add-group';
      addBtn.textContent = '+ Add Another';
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleAddRepetition(statement, container);
      });
      
      controls.appendChild(addBtn);
      container.appendChild(controls);
      
      // Initialize repetition tracking
      container._repetitionCount = 1;
    }
    
    return container;
  }

  /**
   * Build a statement field with proper label from predicate
   */
  buildStatementField(statement, index = 0) {
    const field = document.createElement('div');
    field.className = 'statement-field';
    field.dataset.statementId = statement.id;
    field.dataset.index = index;
    
    // Get the predicate label for the field label
    const predicateLabel = this.getLabel(statement.predicate);
    
    // Special case: rdf:type statements with fixed object (read-only)
    if (statement.predicate === 'rdf:type' || 
        statement.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
      const label = this.createLabelElement(predicateLabel, statement.predicate);
      
      const display = document.createElement('div');
      display.className = 'readonly-value';
      display.textContent = this.getLabel(statement.object);
      
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = `statement_${statement.id}_${index}`;
      hiddenInput.value = statement.object;
      
      field.appendChild(label);
      field.appendChild(display);
      field.appendChild(hiddenInput);
      
      return field;
    }
    
    // Get placeholder for the object
    const objectId = statement.object.replace('sub:', '');
    const objectPlaceholder = this.template.placeholders.find(p => p.id === objectId);
    
    // Create label
    const label = this.createLabelElement(predicateLabel, statement.predicate, !statement.optional);
    field.appendChild(label);
    
    // Create input based on placeholder type
    let input;
    if (objectPlaceholder) {
      input = this.createInputForPlaceholder(objectPlaceholder, index);
      input.name = `statement_${statement.id}_${index}`;
      input.id = `statement_${statement.id}_${index}`;
    } else {
      // Fallback: text input
      input = document.createElement('input');
      input.type = 'text';
      input.name = `statement_${statement.id}_${index}`;
      input.placeholder = this.getLabel(statement.object);
    }
    
    if (!statement.optional) {
      input.required = true;
    }
    
    field.appendChild(input);
    
    return field;
  }

  /**
   * Handle adding a repetition
   */
  handleAddRepetition(statement, container) {
    const count = container._repetitionCount || 1;
    container._repetitionCount = count + 1;
    
    const newField = this.buildStatementField(statement, count);
    
    // Insert before controls
    const controls = container.querySelector('.repetition-controls');
    if (controls) {
      container.insertBefore(newField, controls);
    } else {
      container.appendChild(newField);
    }
    
    this.emit('change', this.collectFormData());
  }

  /**
   * Create input element based on placeholder configuration
   */
  createInputForPlaceholder(placeholder, index = 0) {
    let input;
    
    switch (placeholder.type) {
      case 'LiteralPlaceholder':
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.maxLength = 500;
        input.placeholder = placeholder.label || '';
        break;
      
      case 'LongLiteralPlaceholder':
        input = document.createElement('textarea');
        input.className = 'form-textarea';
        input.rows = 4;
        input.maxLength = 5000;
        input.placeholder = placeholder.label || '';
        break;
      
      case 'ExternalUriPlaceholder':
      case 'TrustyUriPlaceholder':
      case 'UriPlaceholder':
        input = document.createElement('input');
        input.type = 'url';
        input.className = 'form-input';
        input.placeholder = placeholder.label || 'https://example.org/...';
        break;
      
      case 'AutoEscapeUriPlaceholder':
      case 'IntroducedResource':
      case 'LocalResource':
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.placeholder = placeholder.label || '';
        break;
      
      case 'RestrictedChoicePlaceholder':
        input = document.createElement('select');
        input.className = 'form-select';
        
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = 'Select...';
        input.appendChild(emptyOption);
        
        // Use pre-loaded options if available
        if (placeholder.options && Array.isArray(placeholder.options) && placeholder.options.length > 0) {
          placeholder.options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value || opt;
            option.textContent = opt.label || opt.value || opt;
            input.appendChild(option);
          });
        }
        break;
      
      case 'GuidedChoicePlaceholder':
        // For now, use text input (API calls would need CORS handling)
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.placeholder = placeholder.label || 'Type to search...';
        break;
      
      default:
        input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.placeholder = placeholder.label || '';
        break;
    }
    
    // Add validation pattern if specified
    if (placeholder.hasRegex) {
      input.pattern = placeholder.hasRegex;
    }
    
    return input;
  }

  /**
   * Build form controls (submit/preview buttons)
   */
  buildFormControls() {
    const controls = document.createElement('div');
    controls.className = 'form-controls';
    
    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'btn btn-secondary';
    previewBtn.textContent = 'Preview';
    previewBtn.addEventListener('click', () => this.handlePreview());
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Create Nanopublication';
    
    controls.appendChild(previewBtn);
    controls.appendChild(submitBtn);
    
    return controls;
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    this.formElement.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
    
    if (this.options.validateOnChange) {
      this.formElement.addEventListener('input', (e) => {
        this.validateField(e.target);
      });
    }
  }

  /**
   * Handle form submission
   */
  handleSubmit() {
    this.formData = this.collectFormData();
    this.emit('submit', { formData: this.formData });
  }

  /**
   * Handle preview
   */
  handlePreview() {
    this.formData = this.collectFormData();
    this.emit('preview', { formData: this.formData });
  }

  /**
   * Collect all form data
   */
  collectFormData() {
    const data = {};
    const form = this.formElement;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.name && input.value) {
        // Handle multiple values for repeated statements
        if (data[input.name]) {
          if (Array.isArray(data[input.name])) {
            data[input.name].push(input.value);
          } else {
            data[input.name] = [data[input.name], input.value];
          }
        } else {
          data[input.name] = input.value;
        }
      }
    });
    
    return data;
  }

  /**
   * Validate a form field
   */
  validateField(field) {
    if (!field.name) return;
    
    let isValid = true;
    let errorMessage = '';
    
    if (field.required && !field.value) {
      isValid = false;
      errorMessage = 'This field is required';
    } else if (field.pattern && field.value && !new RegExp(field.pattern).test(field.value)) {
      isValid = false;
      errorMessage = 'Invalid format';
    } else if (field.type === 'url' && field.value) {
      try {
        new URL(field.value);
      } catch {
        isValid = false;
        errorMessage = 'Please enter a valid URL';
      }
    }
    
    const parent = field.closest('.form-field, .statement-field');
    if (parent) {
      if (isValid) {
        parent.classList.remove('error');
        const existingError = parent.querySelector('.error-message');
        if (existingError) existingError.remove();
      } else {
        parent.classList.add('error');
        let errorEl = parent.querySelector('.error-message');
        if (!errorEl) {
          errorEl = document.createElement('div');
          errorEl.className = 'error-message';
          parent.appendChild(errorEl);
        }
        errorEl.textContent = errorMessage;
      }
    }
    
    return isValid;
  }

  /**
   * Validate entire form
   */
  validate() {
    const inputs = this.formElement.querySelectorAll('input, select, textarea');
    let isValid = true;
    const errors = [];
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
        errors.push({
          field: input.name,
          message: input.closest('.error-message')?.textContent || 'Validation error'
        });
      }
    });
    
    return {
      isValid,
      errors
    };
  }

  /**
   * Event emitter
   */
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => callback(data));
    }
  }

  /**
   * Destroy and clean up
   */
  destroy() {
    if (this.formElement) {
      this.formElement.remove();
    }
    this.formElement = null;
    this.formData = {};
    this.eventListeners = { change: [], submit: [], preview: [] };
  }
}

export default FormGenerator;
