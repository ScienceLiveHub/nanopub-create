/**
 * Enhanced Form Generator with Grouped Statement Support
 * 
 * This version implements the complete nanodash pattern for grouped statements
 * including RepetitionGroup logic, proper button visibility, and visual styling.
 * 
 * Key Features:
 * - Grouped statements render as visual groups
 * - Repeatable groups with add/remove controls
 * - Button visibility follows nanodash logic
 * - Visual separators between repeated groups
 * - Optional mark on single instances
 * 
 * Based on: nanodash StatementItem.java and Science Live meta-template
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
   * Get human-readable label for a URI
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
    
    // Special cases
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
      return 'Type';
    }
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#subject') {
      return 'Subject';
    }
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate') {
      return 'Predicate';
    }
    if (uri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#object') {
      return 'Object';
    }
    
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
  createLabelElement(text, uri = null) {
    const label = document.createElement('label');
    label.textContent = text;
    
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

    // Add regular placeholder fields
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
   * Build statements section (handles both regular and grouped statements)
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
      let statementElement;
      
      if (statement.grouped) {
        // Use grouped statement builder (nanodash pattern)
        statementElement = this.buildGroupedStatement(statement);
      } else {
        // Use regular statement builder
        statementElement = this.buildRegularStatement(statement);
      }
      
      statementsContainer.appendChild(statementElement);
    });
    
    section.appendChild(statementsContainer);
    return section;
  }

  /**
   * ========================================================================
   * GROUPED STATEMENT IMPLEMENTATION (Following nanodash patterns)
   * ========================================================================
   */

  /**
   * Build a grouped statement component (following nanodash patterns)
   * This is the main entry point for grouped statements
   */
  buildGroupedStatement(statement) {
    const container = document.createElement('div');
    container.dataset.statementId = statement.id;
    
    // Add CSS classes based on statement properties
    const classes = ['nanopub-statement', 'grouped-statement'];
    if (statement.grouped || statement.repeatable) {
      classes.push('nanopub-group');
    }
    if (statement.optional && !this.options.readOnly) {
      classes.push('nanopub-optional');
    }
    container.className = classes.join(' ');
    
    // Add header with statement label
    const header = document.createElement('div');
    header.className = 'statement-header';
    const headerText = this.getLabel(statement.id) || 'Statement Group';
    header.textContent = headerText;
    container.appendChild(header);
    
    // Create repetition groups array
    const repetitionGroups = [];
    
    // Add first group
    const firstGroup = this.createRepetitionGroup(statement, 0);
    repetitionGroups.push(firstGroup);
    container.appendChild(firstGroup.element);
    
    // Store reference to repetition groups
    container._repetitionGroups = repetitionGroups;
    container._statement = statement;
    
    // Initialize button visibility
    this.updateRepetitionButtons(container);
    
    return container;
  }

  /**
   * Create a single repetition group instance
   * Each group contains all nested statement fields
   */
  createRepetitionGroup(statement, index) {
    const groupData = {
      index: index,
      element: null,
      fields: [],
      values: {}
    };
    
    const groupElement = document.createElement('div');
    groupElement.className = 'repetition-group';
    groupElement.dataset.index = index;
    
    // Add separator if not first group (nanodash pattern)
    if (index > 0) {
      const separator = document.createElement('hr');
      separator.className = 'group-separator';
      groupElement.appendChild(separator);
    }
    
    // Create fields container
    const fieldsContainer = document.createElement('div');
    fieldsContainer.className = 'grouped-fields';
    
    // Add each nested statement as a field
    statement.nestedStatements.forEach(nested => {
      const field = this.buildStatementField(nested, index);
      fieldsContainer.appendChild(field);
      groupData.fields.push(field);
    });
    
    groupElement.appendChild(fieldsContainer);
    
    // Add control buttons
    const controls = this.createGroupControls(statement, index, groupElement);
    groupElement.appendChild(controls);
    
    groupData.element = groupElement;
    return groupData;
  }

  /**
   * Create add/remove buttons for a repetition group
   * Implements nanodash button visibility logic
   */
  createGroupControls(statement, index, groupElement) {
    const controls = document.createElement('div');
    controls.className = 'repetition-controls';
    
    // Remove button (hidden for first/only group)
    if (statement.repeatable && !this.options.readOnly) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove-group';
      removeBtn.textContent = '− Remove';
      removeBtn.style.display = 'none'; // Will be shown by updateButtons()
      
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.removeRepetitionGroup(groupElement.closest('.grouped-statement'), index);
      });
      
      controls.appendChild(removeBtn);
    }
    
    // Add button (only on last group)
    if (statement.repeatable && !this.options.readOnly) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn-add-group';
      addBtn.textContent = '+ Add Another';
      addBtn.style.display = 'none'; // Will be shown by updateButtons()
      
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.addRepetitionGroup(groupElement.closest('.grouped-statement'));
      });
      
      controls.appendChild(addBtn);
    }
    
    // Optional mark (only on single instance)
    if (statement.optional && !this.options.readOnly) {
      const optionalMark = document.createElement('span');
      optionalMark.className = 'optional-mark';
      optionalMark.textContent = '(optional)';
      optionalMark.style.display = 'none'; // Will be shown by updateButtons()
      controls.appendChild(optionalMark);
    }
    
    return controls;
  }

  /**
   * Add a new repetition group (called when "+ Add Another" clicked)
   */
  addRepetitionGroup(container) {
    const statement = container._statement;
    const repetitionGroups = container._repetitionGroups;
    const newIndex = repetitionGroups.length;
    
    const newGroup = this.createRepetitionGroup(statement, newIndex);
    repetitionGroups.push(newGroup);
    
    // Append to container (before any subsequent elements)
    const lastGroup = repetitionGroups[repetitionGroups.length - 2].element;
    lastGroup.parentElement.insertBefore(newGroup.element, lastGroup.nextSibling);
    
    // Update button visibility following nanodash logic
    this.updateRepetitionButtons(container);
    
    // Trigger change event
    this.emit('change', { action: 'addGroup', statementId: statement.id, groupIndex: newIndex });
  }

  /**
   * Remove a repetition group (called when "− Remove" clicked)
   */
  removeRepetitionGroup(container, indexToRemove) {
    const repetitionGroups = container._repetitionGroups;
    
    if (repetitionGroups.length <= 1) {
      return; // Can't remove last group
    }
    
    // Find and remove from DOM
    const groupToRemove = repetitionGroups.find(g => g.index === indexToRemove);
    if (groupToRemove) {
      groupToRemove.element.remove();
    }
    
    // Remove from array
    repetitionGroups.splice(repetitionGroups.findIndex(g => g.index === indexToRemove), 1);
    
    // Re-index remaining groups
    repetitionGroups.forEach((group, i) => {
      group.index = i;
      group.element.dataset.index = i;
      
      // Update field names
      group.fields.forEach(fieldElement => {
        const input = fieldElement.querySelector('input, select, textarea');
        if (input) {
          const oldName = input.name;
          const newName = oldName.replace(/_\d+$/, `_${i}`);
          input.name = newName;
          input.dataset.groupIndex = i;
        }
      });
    });
    
    // Update button visibility
    this.updateRepetitionButtons(container);
    
    // Trigger change event
    this.emit('change', { action: 'removeGroup', statementId: container._statement.id, groupIndex: indexToRemove });
  }

  /**
   * Update visibility of add/remove buttons following nanodash logic
   * 
   * Rules (from nanodash StatementItem.java):
   * - Add button: only visible on last group
   * - Remove button: visible on all except when only one
   * - Optional mark: only visible when single instance
   */
  updateRepetitionButtons(container) {
    const statement = container._statement;
    const repetitionGroups = container._repetitionGroups;
    const isOnly = repetitionGroups.length === 1;
    
    repetitionGroups.forEach((group, i) => {
      const controls = group.element.querySelector('.repetition-controls');
      if (!controls) return;
      
      const isLast = i === repetitionGroups.length - 1;
      
      // Add button: only visible on last group (nanodash pattern)
      const addBtn = controls.querySelector('.btn-add-group');
      if (addBtn) {
        addBtn.style.display = (statement.repeatable && isLast && !this.options.readOnly) 
          ? 'inline-block' 
          : 'none';
      }
      
      // Remove button: visible on all except when only one (nanodash pattern)
      const removeBtn = controls.querySelector('.btn-remove-group');
      if (removeBtn) {
        removeBtn.style.display = (statement.repeatable && !isOnly && !this.options.readOnly) 
          ? 'inline-block' 
          : 'none';
      }
      
      // Optional mark: only visible when single instance (nanodash pattern)
      const optionalMark = controls.querySelector('.optional-mark');
      if (optionalMark) {
        optionalMark.style.display = (statement.optional && isOnly && !this.options.readOnly) 
          ? 'inline' 
          : 'none';
      }
    });
  }

  /**
   * Build a statement field (for use in grouped statements)
   * Creates label + input for one part of a grouped statement
   */
  buildStatementField(statement, groupIndex = 0) {
    const field = document.createElement('div');
    field.className = 'statement-field';
    field.dataset.statementId = statement.id;
    
    // Create label using the predicate
    const label = this.createLabelElement(
      this.getLabel(statement.predicate),
      statement.predicate
    );
    
    // Determine field type based on object
    const objectPlaceholder = this.template.placeholders.find(
      p => `sub:${p.id}` === statement.object || p.id === statement.object.replace('sub:', '')
    );
    
    let input;
    if (objectPlaceholder) {
      // Use placeholder configuration to create appropriate input
      input = this.createInputForPlaceholder(objectPlaceholder, groupIndex);
    } else {
      // Default text input
      input = document.createElement('input');
      input.type = 'text';
      input.placeholder = this.getLabel(statement.object);
    }
    
    input.name = `statement_${statement.id}_object_${groupIndex}`;
    input.dataset.statementId = statement.id;
    input.dataset.groupIndex = groupIndex;
    
    // Add validation if needed
    if (objectPlaceholder && objectPlaceholder.validation) {
      if (objectPlaceholder.validation.regex) {
        input.pattern = objectPlaceholder.validation.regex;
      }
      if (objectPlaceholder.required) {
        input.required = true;
      }
    }
    
    field.appendChild(label);
    field.appendChild(input);
    
    return field;
  }

  /**
   * Create input element based on placeholder configuration
   */
  createInputForPlaceholder(placeholder, groupIndex = 0) {
    let input;
    
    switch (placeholder.type) {
      case 'LiteralPlaceholder':
        input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 200;
        break;
      
      case 'LongLiteralPlaceholder':
        input = document.createElement('textarea');
        input.rows = 4;
        input.maxLength = 5000;
        break;
      
      case 'ExternalUriPlaceholder':
      case 'TrustyUriPlaceholder':
      case 'UriPlaceholder':
        input = document.createElement('input');
        input.type = 'url';
        input.placeholder = 'https://example.org/...';
        break;
      
      case 'RestrictedChoicePlaceholder':
      case 'GuidedChoicePlaceholder':
        input = document.createElement('select');
        input.innerHTML = '<option value="">Select...</option>';
        // Options would be populated from placeholder.options
        if (placeholder.options) {
          placeholder.options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value || opt;
            option.textContent = opt.label || opt;
            input.appendChild(option);
          });
        }
        break;
      
      case 'ValuePlaceholder':
      case 'LocalResource':
      default:
        input = document.createElement('input');
        input.type = 'text';
        break;
    }
    
    if (placeholder.label) {
      input.placeholder = placeholder.label;
    }
    
    return input;
  }

  /**
   * END OF GROUPED STATEMENT IMPLEMENTATION
   * ========================================================================
   */

  /**
   * Build a regular (non-grouped) statement
   */
  buildRegularStatement(statement) {
    const container = document.createElement('div');
    container.className = 'nanopub-statement regular-statement';
    container.dataset.statementId = statement.id;
    
    if (statement.optional && !this.options.readOnly) {
      container.classList.add('nanopub-optional');
    }
    
    // For now, simple implementation
    const field = this.buildStatementField(statement, 0);
    container.appendChild(field);
    
    // If repeatable, add button
    if (statement.repeatable && !this.options.readOnly) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'btn-add-statement';
      addBtn.textContent = '+ Add Another';
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        // TODO: Implement repeatable statement logic
      });
      container.appendChild(addBtn);
    }
    
    return container;
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
   * Get placeholders that are not part of statements
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
    // Implementation details...
    return {
      id: placeholder.id,
      name: placeholder.id,
      label: placeholder.label || this.getLabel(`sub:${placeholder.id}`),
      type: placeholder.type,
      required: placeholder.required !== false
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
      const desc = document.createElement('p');
      desc.className = 'form-description';
      desc.textContent = schema.description;
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
    
    const label = this.createLabelElement(field.label);
    if (field.required) {
      const required = document.createElement('span');
      required.className = 'required-mark';
      required.textContent = '*';
      label.appendChild(required);
    }
    
    const input = this.createInputForPlaceholder(field, 0);
    input.name = field.name;
    input.required = field.required;
    
    fieldElement.appendChild(label);
    fieldElement.appendChild(input);
    
    return fieldElement;
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
    
    // Validation on change if enabled
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
   * Collect all form data including grouped statements
   */
  collectFormData() {
    const data = {};
    const form = this.formElement;
    
    // Collect all inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.name) {
        data[input.name] = input.value;
      }
    });
    
    return data;
  }

  /**
   * Validate a form field
   */
  validateField(field) {
    // Implementation...
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
