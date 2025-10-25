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
    
    // Only add "Select..." if there are multiple options
    if (placeholder.options && placeholder.options.length > 1) {
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = 'Select...';
      select.appendChild(emptyOption);
    }
    
    console.log(`[RestrictedChoice] Rendering ${placeholder.id} with ${placeholder.options?.length || 0} options`);
    
    // Options are loaded by templateParser
    if (placeholder.options && Array.isArray(placeholder.options)) {
      placeholder.options.forEach((opt, idx) => {
        const option = document.createElement('option');
        option.value = opt.value || opt;
        option.textContent = opt.label || opt.value || opt;
        
        // Auto-select if only one option
        if (placeholder.options.length === 1) {
          option.selected = true;
        }
        
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
  },
  
  'AgentPlaceholder': (placeholder) => {
    const input = document.createElement('input');
    input.type = 'url';
    input.className = 'form-input';
    input.placeholder = placeholder.label || 'https://orcid.org/...';
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
    
    return placeholder;
  }

  /**
   * Check if a value is a fixed literal (not a placeholder)
   */
  isFixedValue(value) {
    if (!value) return false;
    
    // First check if there's a placeholder for this value
    const placeholder = this.findPlaceholder(value);
    if (placeholder) {
      return false; // It's a placeholder, not fixed
    }
    
    // If it's a URI (starts with http or has angle brackets), it's fixed
    if (value.startsWith('http') || value.startsWith('<')) {
      return true;
    }
    
    // If it's a simple id without colon or slash, and no placeholder, it's fixed
    if (!value.includes(':') && !value.includes('/')) {
      return true;
    }
    
    // If it's a prefixed URI like foaf:name or rdf:type (and no placeholder), it's fixed
    if (value.includes(':')) {
      return true;
    }
    
    return false;
  }

  /**
   * Render form
   */
  renderForm(container) {
    console.log('Rendering form with template:', this.template);
    
    this.formElement = document.createElement('form');
    this.formElement.className = 'nanopub-form';
    
    // Header
    const header = document.createElement('div');
    header.className = 'form-header';
    
    const title = document.createElement('h2');
    title.textContent = this.template.label || 'Nanopublication Template';
    header.appendChild(title);
    
    if (this.template.description) {
      const desc = document.createElement('p');
      desc.className = 'form-description';
      desc.textContent = this.template.description;
      header.appendChild(desc);
    }
    
    this.formElement.appendChild(header);
    
    // Fields
    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'form-fields';
    
    this.renderFields(fieldsContainer);
    
    this.formElement.appendChild(fieldsContainer);
    
    // Controls
    this.formElement.appendChild(this.buildControls());
    
    // Clear and append
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container) {
      container.innerHTML = '';
      container.appendChild(this.formElement);
      this.setupEventListeners();
    }
    
    return this.formElement;
  }

  /**
   * Render fields from statements
   */
  renderFields(container) {
    // Group statements by their grouping
    const processedGroups = new Set();
    
    this.template.statements.forEach(statement => {
      // Skip if this statement is part of a grouped statement we've already processed
      const parentGroup = this.template.groupedStatements.find(g => 
        g.statements.includes(statement.id)
      );
      
      if (parentGroup && processedGroups.has(parentGroup.id)) {
        return;
      }
      
      if (statement.grouped && parentGroup) {
        // Render the entire group together
        this.renderGroupedStatement(container, parentGroup, statement);
        processedGroups.add(parentGroup.id);
      } else {
        // Render individual statement
        this.renderStatement(container, statement);
      }
    });
  }

  /**
   * Render a grouped statement (multiple sub-statements as one field group)
   */
  renderGroupedStatement(container, group, parentStatement) {
    const groupContainer = document.createElement('div');
    groupContainer.className = 'form-field-group';
    if (parentStatement.repeatable) {
      groupContainer.classList.add('repeatable-group');
    }
    if (parentStatement.optional) {
      groupContainer.classList.add('optional-group');
    }
    
    // Find all statements in this group
    const groupStatements = group.statements
      .map(stId => this.template.statements.find(s => s.id === stId))
      .filter(s => s);
    
    // Use the first statement's subject as the group label
    const firstStmt = groupStatements[0];
    if (firstStmt) {
      const subjectPlaceholder = this.findPlaceholder(firstStmt.subject);
      if (subjectPlaceholder) {
        const groupLabel = document.createElement('div');
        groupLabel.className = 'field-group-label';
        groupLabel.textContent = subjectPlaceholder.label || this.getLabel(firstStmt.subject);
        groupContainer.appendChild(groupLabel);
      }
    }
    
    // Render each statement in the group
    groupStatements.forEach(stmt => {
      this.renderStatementInGroup(groupContainer, stmt);
    });
    
    // Add repeatable controls if needed
    if (parentStatement.repeatable) {
      groupContainer.appendChild(this.buildRepeatableControls(parentStatement, null));
    }
    
    container.appendChild(groupContainer);
  }

  /**
   * Render a statement within a group (no separate labels for subject)
   */
  renderStatementInGroup(container, statement) {
    const objectPlaceholder = this.findPlaceholder(statement.object);
    const predicatePlaceholder = this.findPlaceholder(statement.predicate);
    
    // Only render if there's a placeholder
    if (!objectPlaceholder && !predicatePlaceholder) {
      // Both are fixed - show as read-only info only if it's a literal
      if (statement.isLiteralObject) {
        const infoField = document.createElement('div');
        infoField.className = 'form-field readonly-field';
        
        const label = document.createElement('label');
        label.className = 'field-label';
        label.textContent = this.getLabel(statement.predicate);
        
        const value = document.createElement('div');
        value.className = 'field-value';
        value.textContent = statement.object;
        
        infoField.appendChild(label);
        infoField.appendChild(value);
        container.appendChild(infoField);
      }
      return;
    }
    
    // Render placeholder input
    const targetPlaceholder = predicatePlaceholder || objectPlaceholder;
    const field = document.createElement('div');
    field.className = 'form-field';
    
    if (statement.optional) {
      field.classList.add('optional');
    }
    
    const label = document.createElement('label');
    label.className = 'field-label';
    label.htmlFor = `field_${statement.id}`;
    
    // Use predicate label, or placeholder label if predicate is the placeholder
    if (predicatePlaceholder) {
      label.textContent = predicatePlaceholder.label || this.getLabel(statement.predicate);
    } else {
      label.textContent = this.getLabel(statement.predicate);
    }
    
    if (statement.optional) {
      const optionalBadge = document.createElement('span');
      optionalBadge.className = 'optional-badge';
      optionalBadge.textContent = 'optional';
      label.appendChild(optionalBadge);
    }
    
    const input = this.renderInput(targetPlaceholder);
    input.name = statement.id;
    input.id = `field_${statement.id}`;
    
    field.appendChild(label);
    field.appendChild(input);
    
    container.appendChild(field);
  }

  /**
   * Render a single statement as a form field
   */
  renderStatement(container, statement) {
    const subjectPlaceholder = this.findPlaceholder(statement.subject);
    const predicatePlaceholder = this.findPlaceholder(statement.predicate);
    const objectPlaceholder = this.findPlaceholder(statement.object);
    
    // Show fixed literal values as read-only
    if (statement.isLiteralObject && !objectPlaceholder && !predicatePlaceholder && !subjectPlaceholder) {
      const infoField = document.createElement('div');
      infoField.className = 'form-field readonly-field';
      
      const label = document.createElement('label');
      label.className = 'field-label';
      label.textContent = this.getLabel(statement.predicate);
      
      const value = document.createElement('div');
      value.className = 'field-value';
      value.textContent = statement.object;
      
      infoField.appendChild(label);
      infoField.appendChild(value);
      container.appendChild(infoField);
      return;
    }
    
    // Skip if no placeholders at all
    if (!subjectPlaceholder && !predicatePlaceholder && !objectPlaceholder) {
      return;
    }
    
    const field = document.createElement('div');
    field.className = 'form-field';
    
    if (statement.repeatable) {
      field.classList.add('repeatable');
    }
    if (statement.optional) {
      field.classList.add('optional');
    }
    
    // Render predicate placeholder if exists
    if (predicatePlaceholder) {
      const predLabel = document.createElement('label');
      predLabel.className = 'field-label';
      predLabel.textContent = predicatePlaceholder.label || this.getLabel(statement.predicate);
      
      const predInput = this.renderInput(predicatePlaceholder);
      predInput.name = `${statement.id}_predicate`;
      predInput.id = `field_${statement.id}_predicate`;
      if (!statement.optional) predInput.required = true;
      
      field.appendChild(predLabel);
      field.appendChild(predInput);
    }
    
    // Render object placeholder if exists
    if (objectPlaceholder) {
      const objLabel = document.createElement('label');
      objLabel.className = 'field-label';
      objLabel.textContent = objectPlaceholder.label || this.getLabel(statement.object);
      
      if (statement.optional) {
        const optionalBadge = document.createElement('span');
        optionalBadge.className = 'optional-badge';
        optionalBadge.textContent = 'optional';
        objLabel.appendChild(optionalBadge);
      }
      
      const objInput = this.renderInput(objectPlaceholder);
      objInput.name = `${statement.id}_object`;
      objInput.id = `field_${statement.id}_object`;
      if (!statement.optional) objInput.required = true;
      
      field.appendChild(objLabel);
      field.appendChild(objInput);
    }
    
    // Render subject placeholder if exists (rare)
    if (subjectPlaceholder && !predicatePlaceholder && !objectPlaceholder) {
      const subjLabel = document.createElement('label');
      subjLabel.className = 'field-label';
      subjLabel.textContent = subjectPlaceholder.label || this.getLabel(statement.subject);
      
      const subjInput = this.renderInput(subjectPlaceholder);
      subjInput.name = `${statement.id}_subject`;
      subjInput.id = `field_${statement.id}_subject`;
      if (!statement.optional) subjInput.required = true;
      
      field.appendChild(subjLabel);
      field.appendChild(subjInput);
    }
    
    container.appendChild(field);
    
    if (statement.repeatable) {
      container.appendChild(this.buildRepeatableControls(statement, null));
    }
  }

  /**
   * Render input based on placeholder type
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
