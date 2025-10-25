/**
 * Component-Based Form Generator 
 * Maps placeholder types to rendering components
 */

// ============================================
// COMPONENT REGISTRY
// ============================================

const FieldComponents = {
  
  'LiteralPlaceholder': (placeholder) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = placeholder.label || '';
    if (placeholder.validation?.regex) {
      input.pattern = placeholder.validation.regex;
    }
    return input;
  },
  
  'LongLiteralPlaceholder': (placeholder) => {
    const textarea = document.createElement('textarea');
    textarea.className = 'form-input';
    textarea.rows = 5;
    textarea.placeholder = placeholder.label || '';
    return textarea;
  },
  
  'ExternalUriPlaceholder': (placeholder) => {
    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'form-input';
    input.placeholder = placeholder.label || 'https://...';
    return input;
  },
  
  'UriPlaceholder': (placeholder) => {
    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'form-input';
    input.placeholder = placeholder.label || 'https://...';
    return input;
  },
  
  'TrustyUriPlaceholder': (placeholder) => {
    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'form-input';
    input.placeholder = placeholder.label || 'https://...';
    return input;
  },
  
  'RestrictedChoicePlaceholder': (placeholder) => {
    const select = document.createElement('select');
    select.className = 'form-input';
    
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Select...';
    select.appendChild(emptyOption);
    
    console.log(`[RestrictedChoice] Rendering ${placeholder.id} with ${placeholder.options?.length || 0} options`);
    
    // Options are loaded by templateParser
    if (placeholder.options && Array.isArray(placeholder.options)) {
      placeholder.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value || opt;
        option.textContent = opt.label || opt.value || opt;
        select.appendChild(option);
      });
    } else {
      console.warn(`[RestrictedChoice] No options found for ${placeholder.id}`);
    }
    
    return select;
  },
  
  'GuidedChoicePlaceholder': (placeholder) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = placeholder.label || 'Type to search...';
    input.setAttribute('data-guided-choice', 'true');
    return input;
  },
  
  'IntroducedResource': (placeholder) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = placeholder.label || '';
    return input;
  },
  
  'LocalResource': (placeholder) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = placeholder.label || '';
    return input;
  },
  
  'AutoEscapeUriPlaceholder': (placeholder) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = placeholder.label || '';
    return input;
  }
};

// ============================================
// FORM GENERATOR
// ============================================

export class FormGenerator {
  constructor(template, options = {}) {
    this.template = template;
    this.options = {
      validateOnChange: true,
      showHelp: true,
      ...options
    };
    
    this.labels = options.labels || template.labels || {};
    this.formData = {};
    this.eventListeners = {
      change: [],
      submit: [],
      preview: []
    };
    this.formElement = null;
  }

  /**
   * Get label for URI or placeholder
   */
  getLabel(uri) {
    if (!uri) return '';
    
    // Check if it's a placeholder reference (starts with sub: and has no colon after)
    if (uri.startsWith('sub:') && !uri.substring(4).includes(':')) {
      const cleanId = uri.replace(/^sub:/, '');
      const placeholder = this.template.placeholders?.find(p => p.id === cleanId);
      if (placeholder?.label) return placeholder.label;
      
      // Parse ID: "post-title" → "Post Title"
      return cleanId.split(/[-_]/).map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
    }
    
    // Try direct label lookup first
    if (this.labels[uri]) {
      const label = this.labels[uri];
      return typeof label === 'string' ? label : 
        (label.label || label['@value'] || label.value || this.parseUriLabel(uri));
    }
    
    // For prefixed URIs (dct:title), expand and try again
    if (!uri.startsWith('http') && uri.includes(':')) {
      const expandedUri = this.expandUri(uri);
      if (expandedUri !== uri && this.labels[expandedUri]) {
        return this.labels[expandedUri];
      }
    }
    
    return this.parseUriLabel(uri);
  }

  /**
   * Expand prefixed URI (e.g., dct:title → http://purl.org/dc/terms/title)
   */
  expandUri(uri) {
    if (!uri || uri.startsWith('http')) return uri;
    
    const colonIndex = uri.indexOf(':');
    if (colonIndex > 0) {
      const prefix = uri.substring(0, colonIndex);
      const localPart = uri.substring(colonIndex + 1);
      
      // Use template prefixes if available
      if (this.template.prefixes && this.template.prefixes[prefix]) {
        return this.template.prefixes[prefix] + localPart;
      }
      
      // Common fallbacks
      const commonPrefixes = {
        'dct': 'http://purl.org/dc/terms/',
        'foaf': 'http://xmlns.com/foaf/0.1/',
        'prov': 'http://www.w3.org/ns/prov#',
        'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
        'schema': 'https://schema.org/',
        'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
      };
      
      if (commonPrefixes[prefix]) {
        return commonPrefixes[prefix] + localPart;
      }
    }
    
    return uri;
  }

  /**
   * Parse label from URI
   */
  parseUriLabel(uri) {
    if (!uri) return '';
    
    // Handle common prefixes first
    const prefixMap = {
      'dct:': 'DC Terms: ',
      'foaf:': 'FOAF: ',
      'prov:': 'Provenance: ',
      'rdfs:': 'RDFS: ',
      'schema:': 'Schema: '
    };
    
    // If it's a prefixed URI (like dct:title), extract the local part
    for (const [prefix, fullName] of Object.entries(prefixMap)) {
      if (uri.startsWith(prefix)) {
        const localPart = uri.substring(prefix.length);
        // Convert camelCase to Title Case
        return localPart.replace(/([a-z])([A-Z])/g, '$1 $2')
                        .split(/[-_]/)
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                        .join(' ');
      }
    }
    
    // For full URIs
    const parts = uri.split(/[#\/]/);
    let label = parts[parts.length - 1] || '';
    
    if (!label && parts.length > 1) {
      label = parts[parts.length - 2];
    }
    
    // camelCase → Title Case
    label = label.replace(/([a-z])([A-Z])/g, '$1 $2')
                 .replace(/[_-]/g, ' ')
                 .replace(/^(has|is)\s+/i, '')
                 .trim()
                 .split(' ')
                 .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                 .join(' ');
    
    return label || uri;
  }

  /**
   * Find placeholder by ID (handles with or without 'sub:' prefix)
   */
  findPlaceholder(objectRef) {
    if (!objectRef) return null;
    
    // Remove 'sub:' prefix if present
    const cleanId = objectRef.replace(/^sub:/, '');
    
    // Search in placeholders
    const placeholder = this.template.placeholders?.find(p => p.id === cleanId);
    
    if (!placeholder) {
      console.warn(`No placeholder found for "${cleanId}" (from "${objectRef}")`);
      console.log('Available placeholders:', this.template.placeholders?.map(p => p.id));
    }
    
    return placeholder;
  }

  /**
   * Render form
   */
  renderForm(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (!container) {
      throw new Error('Container not found');
    }
    
    container.innerHTML = '';
    container.className = 'nanopub-creator';

    const form = document.createElement('form');
    form.className = 'creator-form';
    form.noValidate = true;
    this.formElement = form;

    // Header
    form.appendChild(this.buildHeader());

    // Build form from statements
    const statements = this.template.statements || [];
    
    console.log('Building form from statements:', statements.length);
    console.log('Available placeholders:', this.template.placeholders?.map(p => ({ id: p.id, type: p.type, label: p.label })));
    
    // Group by optional/required
    const requiredStatements = [];
    const optionalStatements = [];
    
    statements.forEach(stmt => {
      // Skip rdf:type
      if (stmt.predicate === 'rdf:type' || 
          stmt.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
        return;
      }
      
      if (stmt.optional) {
        optionalStatements.push(stmt);
      } else {
        requiredStatements.push(stmt);
      }
    });

    console.log('Required statements:', requiredStatements.length);
    console.log('Optional statements:', optionalStatements.length);

    // Required fields section
    if (requiredStatements.length > 0) {
      const section = document.createElement('div');
      section.className = 'form-section';
      
      requiredStatements.forEach(stmt => {
        const field = this.buildStatementField(stmt);
        if (field) section.appendChild(field);
      });
      
      form.appendChild(section);
    }

    // Optional fields section
    if (optionalStatements.length > 0) {
      const section = document.createElement('div');
      section.className = 'form-section optional-section';
      
      const header = document.createElement('h3');
      header.textContent = 'Additional Information (Optional)';
      header.className = 'section-header';
      section.appendChild(header);
      
      optionalStatements.forEach(stmt => {
        const field = this.buildStatementField(stmt);
        if (field) section.appendChild(field);
      });
      
      form.appendChild(section);
    }

    // Controls
    form.appendChild(this.buildControls());

    container.appendChild(form);
    this.setupEventListeners();
    
    return form;
  }

  /**
   * Build header
   */
  buildHeader() {
    const header = document.createElement('div');
    header.className = 'form-header';
    
    const title = document.createElement('h2');
    title.textContent = this.template.label || 'Create Nanopublication';
    header.appendChild(title);
    
    if (this.template.description) {
      const desc = document.createElement('div');
      desc.className = 'form-description';
      desc.innerHTML = this.template.description;
      header.appendChild(desc);
    }
    
    return header;
  }

  /**
   * Build field for a statement
   * Creates fields for ALL placeholders (subject, predicate, object)
   * Handles grouped statements
   */
  buildStatementField(statement) {
    // Check if this is a grouped statement
    const groupedStatement = this.template.groupedStatements?.find(g => g.id === statement.id);
    
    if (groupedStatement) {
      // Render all statements in the group together
      return this.buildGroupedStatementField(groupedStatement, statement);
    }
    
    // Check which positions have placeholders
    const subjectPlaceholder = this.findPlaceholder(statement.subject);
    const predicatePlaceholder = this.findPlaceholder(statement.predicate);
    const objectPlaceholder = this.findPlaceholder(statement.object);
    
    // If no placeholders, skip this statement (it's all literals)
    if (!subjectPlaceholder && !predicatePlaceholder && !objectPlaceholder) {
      console.log(`Skipping statement ${statement.id} - no placeholders found (all literals)`);
      return null;
    }
    
    const container = document.createElement('div');
    container.className = 'form-field-group';
    container.dataset.statementId = statement.id;
    
    // Add statement label/context if needed (when multiple placeholders)
    if ((subjectPlaceholder ? 1 : 0) + (predicatePlaceholder ? 1 : 0) + (objectPlaceholder ? 1 : 0) > 1) {
      const contextLabel = document.createElement('div');
      contextLabel.className = 'statement-context';
      
      // Use predicate as context label if it's not a placeholder
      if (!predicatePlaceholder && statement.predicate) {
        const predicateLabel = this.getLabel(statement.predicate);
        contextLabel.textContent = predicateLabel;
      } else {
        // Don't show a label - let the individual field labels speak for themselves
        // Just add spacing
        contextLabel.style.display = 'none';
      }
      
      container.appendChild(contextLabel);
    }
    
    // Create field for SUBJECT if it's a placeholder
    if (subjectPlaceholder) {
      const field = this.buildSingleField(statement.id, 'subject', subjectPlaceholder, statement.optional);
      if (field) container.appendChild(field);
    }
    
    // Create field for PREDICATE if it's a placeholder
    if (predicatePlaceholder) {
      const field = this.buildSingleField(statement.id, 'predicate', predicatePlaceholder, statement.optional);
      if (field) container.appendChild(field);
    }
    
    // Create field for OBJECT if it's a placeholder
    if (objectPlaceholder) {
      const field = this.buildSingleField(statement.id, 'object', objectPlaceholder, statement.optional);
      if (field) container.appendChild(field);
    }
    
    // Repeatable controls for the entire statement group
    if (statement.repeatable && (subjectPlaceholder || predicatePlaceholder || objectPlaceholder)) {
      const firstPlaceholder = subjectPlaceholder || predicatePlaceholder || objectPlaceholder;
      container.appendChild(this.buildRepeatableControls(statement, firstPlaceholder));
    }
    
    return container;
  }

  /**
   * Build field for a grouped statement
   */
  buildGroupedStatementField(groupedStatement, statement) {
    const container = document.createElement('div');
    container.className = 'form-field-group grouped';
    container.dataset.statementId = groupedStatement.id;
    
    console.log(`Building grouped statement ${groupedStatement.id} with statements:`, groupedStatement.statements);
    
    // Collect all placeholders from all statements in the group
    const allPlaceholders = [];
    
    groupedStatement.statements.forEach(stmtId => {
      const stmt = this.template.statements.find(s => s.id === stmtId);
      if (!stmt) {
        console.warn(`Statement ${stmtId} not found in grouped statement ${groupedStatement.id}`);
        return;
      }
      
      const subjectPlaceholder = this.findPlaceholder(stmt.subject);
      const predicatePlaceholder = this.findPlaceholder(stmt.predicate);
      const objectPlaceholder = this.findPlaceholder(stmt.object);
      
      // Add unique placeholders
      if (subjectPlaceholder && !allPlaceholders.find(p => p.id === subjectPlaceholder.id)) {
        allPlaceholders.push({ ...subjectPlaceholder, position: 'subject', stmtId: stmt.id });
      }
      if (predicatePlaceholder && !allPlaceholders.find(p => p.id === predicatePlaceholder.id)) {
        allPlaceholders.push({ ...predicatePlaceholder, position: 'predicate', stmtId: stmt.id });
      }
      if (objectPlaceholder && !allPlaceholders.find(p => p.id === objectPlaceholder.id)) {
        allPlaceholders.push({ ...objectPlaceholder, position: 'object', stmtId: stmt.id });
      }
    });
    
    if (allPlaceholders.length === 0) {
      console.log(`Skipping grouped statement ${groupedStatement.id} - no placeholders found`);
      return null;
    }
    
    // Render each unique placeholder
    allPlaceholders.forEach(placeholder => {
      const field = this.buildSingleField(
        placeholder.stmtId,
        placeholder.position,
        placeholder,
        statement.optional
      );
      if (field) container.appendChild(field);
    });
    
    // Repeatable controls
    if (statement.repeatable && allPlaceholders.length > 0) {
      container.appendChild(this.buildRepeatableControls(statement, allPlaceholders[0]));
    }
    
    return container;
  }

  /**
   * Build a single field for one position (subject/predicate/object)
   */
  buildSingleField(statementId, position, placeholder, isOptional) {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'form-field';
    fieldDiv.dataset.position = position;
    
    // Label from placeholder
    const label = document.createElement('label');
    label.textContent = placeholder.label || placeholder.id;
    
    if (!isOptional) {
      const required = document.createElement('span');
      required.className = 'required-mark';
      required.textContent = ' *';
      label.appendChild(required);
    } else {
      const optional = document.createElement('span');
      optional.className = 'optional-mark';
      optional.textContent = ' (optional)';
      label.appendChild(optional);
    }
    
    fieldDiv.appendChild(label);
    
    console.log(`Building field for statement ${statementId} ${position}:`, {
      placeholderType: placeholder.type,
      placeholderLabel: placeholder.label
    });
    
    // Render input using component registry
    const input = this.renderInput(placeholder);
    input.name = `${statementId}_${position}_0`;
    input.id = `field_${statementId}_${position}_0`;
    if (!isOptional) input.required = true;
    
    fieldDiv.appendChild(input);
    
    return fieldDiv;
  }

  /**
   * Render input using component registry
   */
  renderInput(placeholder) {
    // Handle multiple types (e.g., "nt:IntroducedResource, nt:LocalResource")
    const types = placeholder.type.split(',').map(t => t.trim().replace(/^nt:/, ''));
    
    // Try each type until we find a matching component
    for (const type of types) {
      const component = FieldComponents[type];
      if (component) {
        console.log(`Using component ${type} for placeholder ${placeholder.id}`);
        return component(placeholder, this.options);
      }
    }
    
    console.warn(`No component for types: ${placeholder.type}`);
    // Fallback to text input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = placeholder.label || '';
    return input;
  }

  /**
   * Build repeatable controls
   */
  buildRepeatableControls(statement, placeholder) {
    const container = document.createElement('div');
    container.className = 'repeatable-controls';
    container.dataset.count = '1';
    
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-add-field';
    addBtn.textContent = '+ Add Another';
    addBtn.onclick = () => {
      const count = parseInt(container.dataset.count);
      container.dataset.count = count + 1;
      
      const field = this.buildRepeatableField(statement, placeholder, count);
      container.parentElement.insertBefore(field, container);
      
      this.emit('change', this.collectFormData());
    };
    
    container.appendChild(addBtn);
    return container;
  }

  /**
   * Build repeatable field instance
   * Now handles multiple placeholders (subject, predicate, object)
   */
  buildRepeatableField(statement, placeholder, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'repeatable-field-group';
    
    // Check which positions have placeholders
    const subjectPlaceholder = this.findPlaceholder(statement.subject);
    const predicatePlaceholder = this.findPlaceholder(statement.predicate);
    const objectPlaceholder = this.findPlaceholder(statement.object);
    
    // Build field for each placeholder position
    if (subjectPlaceholder) {
      const field = document.createElement('div');
      field.className = 'repeatable-field';
      const input = this.renderInput(subjectPlaceholder);
      input.name = `${statement.id}_subject_${index}`;
      input.id = `field_${statement.id}_subject_${index}`;
      field.appendChild(input);
      wrapper.appendChild(field);
    }
    
    if (predicatePlaceholder) {
      const field = document.createElement('div');
      field.className = 'repeatable-field';
      const input = this.renderInput(predicatePlaceholder);
      input.name = `${statement.id}_predicate_${index}`;
      input.id = `field_${statement.id}_predicate_${index}`;
      field.appendChild(input);
      wrapper.appendChild(field);
    }
    
    if (objectPlaceholder) {
      const field = document.createElement('div');
      field.className = 'repeatable-field';
      const input = this.renderInput(objectPlaceholder);
      input.name = `${statement.id}_object_${index}`;
      input.id = `field_${statement.id}_object_${index}`;
      field.appendChild(input);
      wrapper.appendChild(field);
    }
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-field';
    removeBtn.textContent = '× Remove';
    removeBtn.onclick = () => wrapper.remove();
    wrapper.appendChild(removeBtn);
    
    return wrapper;
  }

  /**
   * Build controls
   */
  buildControls() {
    const controls = document.createElement('div');
    controls.className = 'form-controls';
    
    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'btn btn-secondary';
    previewBtn.textContent = 'Preview';
    previewBtn.onclick = () => this.handlePreview();
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Create Nanopublication';
    
    controls.appendChild(previewBtn);
    controls.appendChild(submitBtn);
    
    return controls;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.formElement.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const validation = this.validate();
      if (!validation.isValid) {
        console.warn('Validation failed:', validation.errors);
        return;
      }
      
      this.formData = this.collectFormData();
      this.emit('submit', { formData: this.formData });
    });
    
    if (this.options.validateOnChange) {
      this.formElement.addEventListener('input', (e) => {
        if (e.target.matches('input, select, textarea')) {
          this.validateField(e.target);
        }
      });
    }
  }

  /**
   * Handle preview
   */
  handlePreview() {
    this.formData = this.collectFormData();
    this.emit('preview', { formData: this.formData });
  }

  /**
   * Collect form data
   */
  collectFormData() {
    const data = {};
    const inputs = this.formElement.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      if (input.name && input.value) {
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
   * Validate field
   */
  validateField(field) {
    let isValid = true;
    let errorMessage = '';
    
    if (field.required && !field.value.trim()) {
      isValid = false;
      errorMessage = 'This field is required';
    } else if (field.pattern && field.value) {
      if (!new RegExp(field.pattern).test(field.value)) {
        isValid = false;
        errorMessage = 'Invalid format';
      }
    } else if (field.type === 'url' && field.value) {
      try {
        new URL(field.value);
      } catch {
        isValid = false;
        errorMessage = 'Please enter a valid URL';
      }
    }
    
    const parent = field.closest('.form-field');
    if (parent) {
      parent.classList.toggle('error', !isValid);
      
      let errorEl = parent.querySelector('.error-message');
      if (!isValid) {
        if (!errorEl) {
          errorEl = document.createElement('div');
          errorEl.className = 'error-message';
          parent.appendChild(errorEl);
        }
        errorEl.textContent = errorMessage;
      } else if (errorEl) {
        errorEl.remove();
      }
    }
    
    return isValid;
  }

  /**
   * Validate form
   */
  validate() {
    const required = this.formElement.querySelectorAll('[required]');
    let isValid = true;
    const errors = [];
    
    required.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
        errors.push({
          field: input.name,
          message: 'Validation error'
        });
      }
    });
    
    return { isValid, errors };
  }

  /**
   * Event system
   */
  on(event, callback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(cb => cb(data));
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.formElement) {
      this.formElement.remove();
    }
    this.formElement = null;
    this.formData = {};
  }
}

export default FormGenerator;
