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
    select.className = 'form-select';
    
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
    input.placeholder = placeholder.label || 'Enter identifier';
    return input;
  },
  
  'LocalResource': (placeholder) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = placeholder.label || 'Enter identifier';
    return input;
  },
  
  'ValuePlaceholder': (placeholder) => {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-input';
    input.placeholder = placeholder.label || 'Enter value';
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
    const processedGroups = new Set();
    const renderedPlaceholders = new Set(); // Track which placeholders we've already shown
    
    console.log('[renderFields] Processing statements...');
    
    // Group consecutive statements by subject
    let currentSubjectGroup = null;
    let currentSubject = null;
    
    this.template.statements.forEach((statement, index) => {
      // Skip if this statement is part of a grouped statement we've already processed
      const parentGroup = this.template.groupedStatements.find(g => 
        g.statements.includes(statement.id)
      );
      
      console.log(`  ${statement.id}: parentGroup=${parentGroup?.id}, processed=${processedGroups.has(parentGroup?.id)}, subject=${statement.subject}`);
      
      if (parentGroup && processedGroups.has(parentGroup.id)) {
        console.log(`    → Skipping (group already processed)`);
        return;
      }
      
      // Skip statements where both subject and object are fixed (not placeholders)
      // These are typically auto-filled like nt:ASSERTION → dct:creator → nt:CREATOR
      const subjectPlaceholder = this.findPlaceholder(statement.subject);
      const objectPlaceholder = this.findPlaceholder(statement.object);
      const predicatePlaceholder = this.findPlaceholder(statement.predicate);
      
      if (!subjectPlaceholder && !objectPlaceholder && !predicatePlaceholder) {
        console.log(`    → Skipping (all fixed - auto-filled statement)`);
        return;
      }
      
      // Also skip if subject is ExternalUriPlaceholder and both predicate/object are fixed
      // These are metadata statements about what the URI should be (like "is a Activity")
      if (subjectPlaceholder && 
          (subjectPlaceholder.type.includes('ExternalUriPlaceholder') || 
           subjectPlaceholder.type.includes('UriPlaceholder')) &&
          !predicatePlaceholder && !objectPlaceholder) {
        console.log(`    → Skipping (URI placeholder metadata statement)`);
        return;
      }
      
      // Check if we're starting a new subject group
      if (statement.subject !== currentSubject) {
        // Close previous subject group if exists
        if (currentSubjectGroup) {
          container.appendChild(currentSubjectGroup);
          currentSubjectGroup = null;
        }
        
        // Check if multiple statements share this subject
        const sameSubjectStatements = this.template.statements.filter(
          s => s.subject === statement.subject
        );
        
        // Create a subject group if there are multiple statements with same subject
        if (sameSubjectStatements.length > 1) {
          currentSubjectGroup = document.createElement('div');
          currentSubjectGroup.className = 'subject-group';
          // Use Science Live colors: purple/magenta palette
          currentSubjectGroup.style.cssText = 'margin: 1.5rem 0; padding: 1.5rem; border: 2px solid #be2e78; border-radius: 8px; background: #f6d7e8; box-shadow: 0 1px 3px rgba(190, 46, 120, 0.1);';
          
          // Add subject header ONLY if the subject is a placeholder (not fixed URIs like nt:ASSERTION)
          const subjectPlaceholder = this.findPlaceholder(statement.subject);
          if (subjectPlaceholder && !renderedPlaceholders.has(subjectPlaceholder.id)) {
            const subjectField = document.createElement('div');
            subjectField.className = 'form-field subject-field';
            
            const subjLabel = document.createElement('label');
            subjLabel.className = 'field-label subject-label';
            subjLabel.style.cssText = 'font-weight: 600; font-size: 1.15em; color: #2b3456; margin-bottom: 0.75rem; display: block;';
            subjLabel.textContent = subjectPlaceholder.label || this.getLabel(statement.subject);
            subjectField.appendChild(subjLabel);
            
            const subjInput = this.renderInput(subjectPlaceholder);
            if (subjInput !== null) {
              subjInput.name = `${statement.id}_subject`;
              subjInput.id = `field_${statement.id}_subject`;
              subjectField.appendChild(subjInput);
            } else {
              // Auto-generated resource - show as readonly
              const value = document.createElement('div');
              value.className = 'field-value auto-generated';
              value.textContent = '(auto-generated)';
              subjectField.appendChild(value);
            }
            
            currentSubjectGroup.appendChild(subjectField);
            renderedPlaceholders.add(subjectPlaceholder.id);
          }
        }
        
        currentSubject = statement.subject;
      }
      
      if (parentGroup) {
        // This statement is part of a group - render the entire group
        console.log(`    → Rendering grouped statement ${parentGroup.id}`);
        const groupContainer = currentSubjectGroup || container;
        this.renderGroupedStatement(groupContainer, parentGroup, statement, renderedPlaceholders);
        processedGroups.add(parentGroup.id);
      } else {
        // Render individual statement
        console.log(`    → Rendering individual statement`);
        const targetContainer = currentSubjectGroup || container;
        this.renderStatement(targetContainer, statement, renderedPlaceholders);
      }
    });
    
    // Close final subject group if exists
    if (currentSubjectGroup) {
      container.appendChild(currentSubjectGroup);
    }
  }

  /**
   * Render a grouped statement (multiple sub-statements as one field group)
   */
  renderGroupedStatement(container, group, parentStatement, renderedPlaceholders = new Set()) {
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
    
    // Render the subject placeholder input at the top if it exists and hasn't been rendered
    const firstStmt = groupStatements[0];
    if (firstStmt) {
      const subjectPlaceholder = this.findPlaceholder(firstStmt.subject);
      if (subjectPlaceholder && !renderedPlaceholders.has(subjectPlaceholder.id)) {
        const subjField = document.createElement('div');
        subjField.className = 'form-field';
        
        const subjLabel = document.createElement('label');
        subjLabel.className = 'field-label';
        subjLabel.textContent = subjectPlaceholder.label || this.getLabel(firstStmt.subject);
        subjField.appendChild(subjLabel);
        
        const subjInput = this.renderInput(subjectPlaceholder);
        subjInput.name = `${firstStmt.id}_subject`;
        subjInput.id = `field_${firstStmt.id}_subject`;
        subjField.appendChild(subjInput);
        
        groupContainer.appendChild(subjField);
        renderedPlaceholders.add(subjectPlaceholder.id);
      }
    }
    
    // Render each statement in the group (predicate + object only)
    groupStatements.forEach(stmt => {
      this.renderStatementInGroup(groupContainer, stmt, renderedPlaceholders);
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
  renderStatementInGroup(container, statement, renderedPlaceholders = new Set()) {
    console.log(`[renderStatementInGroup] ${statement.id}:`, {
      predicate: statement.predicate,
      object: statement.object,
      isLiteralObject: statement.isLiteralObject
    });
    
    const objectPlaceholder = this.findPlaceholder(statement.object);
    const predicatePlaceholder = this.findPlaceholder(statement.predicate);
    
    console.log(`  objectPlaceholder:`, objectPlaceholder?.id);
    console.log(`  predicatePlaceholder:`, predicatePlaceholder?.id);
    
    // Check if we need to render anything
    const needToRenderPredicate = predicatePlaceholder && !renderedPlaceholders.has(predicatePlaceholder.id);
    const needToRenderObject = objectPlaceholder && !renderedPlaceholders.has(objectPlaceholder.id);
    
    // If both predicate and object are placeholders that were already rendered, skip this statement
    if (predicatePlaceholder && objectPlaceholder && 
        !needToRenderPredicate && !needToRenderObject) {
      console.log(`  → SKIP (both placeholders already rendered)`);
      return;
    }
    
    // Always show the predicate label for context
    const predicateLabel = this.getLabel(statement.predicate);
    
    // Both are fixed - show as read-only info
    if (!objectPlaceholder && !predicatePlaceholder) {
      console.log(`  → READONLY path: ${predicateLabel} = ${statement.object}`);
      const infoField = document.createElement('div');
      infoField.className = 'form-field readonly-field';
      
      const label = document.createElement('label');
      label.className = 'field-label';
      label.textContent = predicateLabel;
      
      const value = document.createElement('div');
      value.className = 'field-value';
      value.textContent = statement.object;
      
      infoField.appendChild(label);
      infoField.appendChild(value);
      container.appendChild(infoField);
      return;
    }
    
    // If object placeholder was already rendered (and predicate is fixed), skip
    if (objectPlaceholder && !needToRenderObject && !predicatePlaceholder) {
      console.log(`  → SKIP (object placeholder already rendered)`);
      return;
    }
    
    console.log(`  → INPUT path`);
    
    // Has placeholder - render input field
    const field = document.createElement('div');
    field.className = 'form-field';
    
    if (statement.optional) {
      field.classList.add('optional');
      setTimeout(() => {
        makeOptionalCollapsible(field, predicateLabel);
      }, 0);
    }
    
    // Show predicate label first
    const predLabelEl = document.createElement('label');
    predLabelEl.className = 'field-label';
    predLabelEl.textContent = predicateLabel;
    field.appendChild(predLabelEl);
    
    // If predicate is a placeholder AND not already rendered, render its input
    if (needToRenderPredicate) {
      const predInput = this.renderInput(predicatePlaceholder);
      predInput.name = `${statement.id}_predicate`;
      predInput.id = `field_${statement.id}_predicate`;
      field.appendChild(predInput);
      renderedPlaceholders.add(predicatePlaceholder.id);
    }
    
    // If object is a placeholder AND not already rendered, render its input
    if (needToRenderObject) {
      // Add placeholder label as help text
      if (objectPlaceholder.label) {
        const helpText = document.createElement('div');
        helpText.className = 'field-help';
        helpText.textContent = objectPlaceholder.label;
        field.appendChild(helpText);
      }
      
      const objInput = this.renderInput(objectPlaceholder);
      objInput.name = statement.id;
      objInput.id = `field_${statement.id}`;
      field.appendChild(objInput);
      renderedPlaceholders.add(objectPlaceholder.id);
    } else if (!objectPlaceholder) {
      // Object is fixed, show its value
      const value = document.createElement('div');
      value.className = 'field-value';
      value.textContent = this.getLabel(statement.object) || statement.object;
      field.appendChild(value);
    }
    
    if (statement.optional) {
      const optionalBadge = document.createElement('span');
      optionalBadge.className = 'optional-badge';
      optionalBadge.textContent = 'optional';
      predLabelEl.appendChild(optionalBadge);
    }
    
    container.appendChild(field);
  }

  /**
   * Render a single statement as a form field
   */
  renderStatement(container, statement, renderedPlaceholders = new Set()) {
    const subjectPlaceholder = this.findPlaceholder(statement.subject);
    const predicatePlaceholder = this.findPlaceholder(statement.predicate);
    const objectPlaceholder = this.findPlaceholder(statement.object);
    
    // Get predicate label for display
    const predicateLabel = this.getLabel(statement.predicate);
    
    // Check if we need to render anything for this statement
    const needToRenderSubject = subjectPlaceholder && !renderedPlaceholders.has(subjectPlaceholder.id);
    const needToRenderPredicate = predicatePlaceholder && !renderedPlaceholders.has(predicatePlaceholder.id);
    const needToRenderObject = objectPlaceholder && !renderedPlaceholders.has(objectPlaceholder.id);
    
    // If all placeholders already rendered and predicate/object are not fixed, skip entirely
    if (!needToRenderSubject && !needToRenderPredicate && !needToRenderObject && 
        (predicatePlaceholder || objectPlaceholder)) {
      return;
    }
    
    // Show fixed predicate/object as read-only (even if subject was already rendered)
    if (!predicatePlaceholder && !objectPlaceholder && !needToRenderSubject) {
      const infoField = document.createElement('div');
      infoField.className = 'form-field readonly-field';
      
      const label = document.createElement('label');
      label.className = 'field-label';
      label.textContent = predicateLabel;
      
      const value = document.createElement('div');
      value.className = 'field-value';
      value.textContent = this.getLabel(statement.object) || statement.object;
      
      infoField.appendChild(label);
      infoField.appendChild(value);
      container.appendChild(infoField);
      return;
    }
    
    const field = document.createElement('div');
    field.className = 'form-field';
    
    if (statement.repeatable) {
      field.classList.add('repeatable');
    }
    if (statement.optional) {
      field.classList.add('optional');
      setTimeout(() => {
        const label = predicatePlaceholder ? 
          (predicatePlaceholder.label || predicateLabel) : 
          predicateLabel;
        makeOptionalCollapsible(field, label);
      }, 0);
    }
    
    // 1. SUBJECT - render first if not already rendered
    if (needToRenderSubject) {
      const subjLabel = document.createElement('label');
      subjLabel.className = 'field-label';
      subjLabel.textContent = subjectPlaceholder.label || this.getLabel(statement.subject);
      field.appendChild(subjLabel);
      
      const subjInput = this.renderInput(subjectPlaceholder);
      if (subjInput !== null) {
        subjInput.name = `${statement.id}_subject`;
        subjInput.id = `field_${statement.id}_subject`;
        if (!statement.optional) subjInput.required = true;
        field.appendChild(subjInput);
      } else {
        // Auto-generated resource - show as readonly
        const value = document.createElement('div');
        value.className = 'field-value auto-generated';
        value.textContent = '(auto-generated)';
        field.appendChild(value);
      }
      
      renderedPlaceholders.add(subjectPlaceholder.id);
    }
    
    // 2. PREDICATE - render second if not already rendered
    if (needToRenderPredicate) {
      const predLabel = document.createElement('label');
      predLabel.className = 'field-label';
      predLabel.textContent = predicatePlaceholder.label || predicateLabel;
      field.appendChild(predLabel);
      
      const predInput = this.renderInput(predicatePlaceholder);
      predInput.name = `${statement.id}_predicate`;
      predInput.id = `field_${statement.id}_predicate`;
      if (!statement.optional) predInput.required = true;
      field.appendChild(predInput);
      
      renderedPlaceholders.add(predicatePlaceholder.id);
    } else if (!predicatePlaceholder) {
      // Show predicate as label even if not a placeholder
      const predLabel = document.createElement('label');
      predLabel.className = 'field-label';
      predLabel.textContent = predicateLabel;
      
      if (statement.optional) {
        const optionalBadge = document.createElement('span');
        optionalBadge.className = 'optional-badge';
        optionalBadge.textContent = 'optional';
        predLabel.appendChild(optionalBadge);
      }
      
      field.appendChild(predLabel);
    }
    
    // 3. OBJECT - render last if not already rendered
    if (needToRenderObject) {
      const objInput = this.renderInput(objectPlaceholder);
      
      // If renderInput returns null (LocalResource, IntroducedResource), treat as readonly
      if (objInput === null) {
        const value = document.createElement('div');
        value.className = 'field-value auto-generated';
        value.textContent = objectPlaceholder.label || statement.object;
        field.appendChild(value);
      } else {
        if (objectPlaceholder.label) {
          const helpText = document.createElement('div');
          helpText.className = 'field-help';
          helpText.textContent = objectPlaceholder.label;
          field.appendChild(helpText);
        }
        
        objInput.name = `${statement.id}_object`;
        objInput.id = `field_${statement.id}_object`;
        if (!statement.optional) objInput.required = true;
        field.appendChild(objInput);
      }
      
      renderedPlaceholders.add(objectPlaceholder.id);
    } else if (!objectPlaceholder) {
      // Show fixed object value
      const value = document.createElement('div');
      value.className = 'field-value';
      value.textContent = this.getLabel(statement.object) || statement.object;
      field.appendChild(value);
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
   * Logic: Only repeat placeholders that are UNIQUE to this repeatable statement
   */
  buildRepeatableField(statement, placeholder, index) {
    const wrapper = document.createElement('div');
    wrapper.className = 'repeatable-field-group';
    
    // Check which positions have placeholders
    const subjectPlaceholder = this.findPlaceholder(statement.subject);
    const predicatePlaceholder = this.findPlaceholder(statement.predicate);
    const objectPlaceholder = this.findPlaceholder(statement.object);
    
    // Determine if subject should be repeated
    // Subject should be repeated ONLY if it's unique to this repeatable statement
    // If the subject appears in other (non-repeatable) statements, it's SHARED and shouldn't repeat
    let shouldRepeatSubject = false;
    if (subjectPlaceholder) {
      // Count how many statements use this subject
      const statementsWithThisSubject = this.template.statements.filter(
        s => s.subject === statement.subject
      );
      
      // If subject ONLY appears in this one repeatable statement, then repeat it
      // If subject appears in multiple statements, it's shared - don't repeat
      shouldRepeatSubject = statementsWithThisSubject.length === 1;
      
      console.log(`[buildRepeatableField] Subject ${statement.subject}:`, {
        occurrences: statementsWithThisSubject.length,
        shouldRepeat: shouldRepeatSubject
      });
    }
    
    // Create subject field if needed
    if (subjectPlaceholder && shouldRepeatSubject) {
      const field = document.createElement('div');
      field.className = 'repeatable-field';
      
      const label = document.createElement('label');
      label.className = 'field-label';
      label.textContent = subjectPlaceholder.label || this.getLabel(statement.subject);
      field.appendChild(label);
      
      const input = this.renderInput(subjectPlaceholder);
      input.name = `${statement.id}_subject_${index}`;
      input.id = `field_${statement.id}_subject_${index}`;
      field.appendChild(input);
      wrapper.appendChild(field);
    }
    
    // Create predicate field if it's a placeholder
    if (predicatePlaceholder) {
      const field = document.createElement('div');
      field.className = 'repeatable-field';
      
      const label = document.createElement('label');
      label.className = 'field-label';
      label.textContent = predicatePlaceholder.label || this.getLabel(statement.predicate);
      field.appendChild(label);
      
      const input = this.renderInput(predicatePlaceholder);
      input.name = `${statement.id}_predicate_${index}`;
      input.id = `field_${statement.id}_predicate_${index}`;
      field.appendChild(input);
      wrapper.appendChild(field);
    }
    
    // Create object field if it's a placeholder
    if (objectPlaceholder) {
      const field = document.createElement('div');
      field.className = 'repeatable-field';
      
      // Show predicate label if predicate is fixed
      if (!predicatePlaceholder) {
        const label = document.createElement('label');
        label.className = 'field-label';
        label.textContent = this.getLabel(statement.predicate);
        field.appendChild(label);
      }
      
      if (objectPlaceholder.label) {
        const helpText = document.createElement('div');
        helpText.className = 'field-help';
        helpText.textContent = objectPlaceholder.label;
        field.appendChild(helpText);
      }
      
      const input = this.renderInput(objectPlaceholder);
      input.name = `${statement.id}_object_${index}`;
      input.id = `field_${statement.id}_object_${index}`;
      field.appendChild(input);
      wrapper.appendChild(field);
    }
    
    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-field';
    removeBtn.textContent = '× Remove';
    removeBtn.onclick = () => {
      wrapper.remove();
      this.emit('change', this.collectFormData());
    };
    wrapper.appendChild(removeBtn);
    
    return wrapper;
  }

  /**
   * Build controls
   */
  buildControls() {
    const controls = document.createElement('div');
    controls.className = 'form-controls';
    
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.className = 'btn btn-primary';
    submitBtn.textContent = 'Create Nanopublication';
    
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
/**
 * Helper function to make optional fields collapsible
 * Add this to formGenerator.js
 */

/**
 * Makes an optional field collapsible with a toggle header
 * @param {HTMLElement} field - The form field element
 * @param {string} label - The label text for the field
 * @returns {HTMLElement} The field with collapsible functionality
 */
function makeOptionalCollapsible(field, label) {
  field.classList.add('optional-collapsible');
  
  // Create toggle header
  const toggle = document.createElement('div');
  toggle.className = 'optional-toggle';
  toggle.innerHTML = `
    <span class="toggle-icon">▶</span>
    <span class="toggle-label">${label}</span>
    <span class="optional-badge">Optional</span>
  `;
  toggle.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 12px;
    background: #f8f9fa;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    margin-bottom: 0;
    transition: all 0.2s;
    user-select: none;
  `;
  
  toggle.addEventListener('mouseenter', () => {
    if (field.classList.contains('collapsed')) {
      toggle.style.background = '#e9ecef';
    }
  });
  
  toggle.addEventListener('mouseleave', () => {
    if (field.classList.contains('collapsed')) {
      toggle.style.background = '#f8f9fa';
    }
  });
  
  // Style the optional badge
  const badge = toggle.querySelector('.optional-badge');
  badge.style.cssText = `
    background: #e7f3ff;
    color: #0066cc;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.75em;
    font-weight: 600;
    margin-left: auto;
  `;
  
  // Style the icon
  const icon = toggle.querySelector('.toggle-icon');
  icon.style.cssText = `
    transition: transform 0.2s;
    font-size: 0.8em;
    color: #666;
    min-width: 12px;
  `;
  
  // Style the label
  const toggleLabel = toggle.querySelector('.toggle-label');
  toggleLabel.style.cssText = `
    font-weight: 500;
    color: #495057;
    flex: 1;
  `;
  
  // Wrap existing content
  const content = document.createElement('div');
  content.className = 'optional-content';
  content.style.cssText = `
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease-out, padding 0.3s ease-out;
    padding: 0;
  `;
  
  // Move all children to content (except the toggle we're about to add)
  const children = Array.from(field.children);
  children.forEach(child => content.appendChild(child));
  
  // Add toggle and content to field
  field.appendChild(toggle);
  field.appendChild(content);
  
  // Start collapsed
  field.classList.add('collapsed');
  
  // Toggle functionality
  toggle.addEventListener('click', () => {
    const isCollapsed = field.classList.contains('collapsed');
    field.classList.toggle('collapsed');
    
    if (isCollapsed) {
      // Expand
      icon.style.transform = 'rotate(90deg)';
      content.style.maxHeight = content.scrollHeight + 'px';
      content.style.padding = '15px 0 0 0';
      toggle.style.background = '#e7f3ff';
      toggle.style.borderColor = '#0066cc';
      badge.style.background = '#d1ecf1';
    } else {
      // Collapse
      icon.style.transform = 'rotate(0deg)';
      content.style.maxHeight = '0';
      content.style.padding = '0';
      toggle.style.background = '#f8f9fa';
      toggle.style.borderColor = '#dee2e6';
      badge.style.background = '#e7f3ff';
    }
  });
  
  // Auto-expand if field has value
  const checkAndExpand = () => {
    const inputs = content.querySelectorAll('input, select, textarea');
    const hasValue = Array.from(inputs).some(input => input.value && input.value.trim());
    if (hasValue && field.classList.contains('collapsed')) {
      toggle.click(); // Auto-expand if has value
    }
  };
  
  // Check after a short delay to let form populate
  setTimeout(checkAndExpand, 100);
  
  // Also check when any input changes
  content.addEventListener('input', () => {
    if (field.classList.contains('collapsed')) {
      toggle.click(); // Expand when user types
    }
  });
  
  return field;
}

/**
 * Auto-fill Enhancement for Nanopub Creator
 * Add to formGenerator.js
 */

class AutoFillManager {
  constructor() {
    this.profile = null;
    this.lastUsed = {};
    this.loadStoredData();
  }

  /**
   * Load profile and last-used values from localStorage
   */
  loadStoredData() {
    try {
      // Load profile
      const profileStr = localStorage.getItem('nanopub-profile');
      if (profileStr) {
        this.profile = JSON.parse(profileStr);
      }

      // Load last-used values
      const lastUsedStr = localStorage.getItem('nanopub-last-used');
      if (lastUsedStr) {
        this.lastUsed = JSON.parse(lastUsedStr);
      }
    } catch (e) {
      console.warn('Failed to load stored data:', e);
    }
  }

  /**
   * Save value to last-used cache
   */
  rememberValue(fieldId, value) {
    if (!value || !value.trim()) return;
    
    this.lastUsed[fieldId] = {
      value: value,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem('nanopub-last-used', JSON.stringify(this.lastUsed));
    } catch (e) {
      console.warn('Failed to save last-used value:', e);
    }
  }

  /**
   * Get auto-fill value for a placeholder
   */
  getAutoFillValue(placeholder, statement) {
    // Priority 1: nt:CREATOR special case
    if (statement.subject === 'nt:CREATOR' || statement.object === 'nt:CREATOR') {
      return this.profile?.orcid || null;
    }

    // Priority 2: Specific field auto-fills based on placeholder type
    const autoFills = {
      // Creator/Author fields
      'creator': () => this.profile?.orcid,
      'author': () => this.profile?.orcid,
      'name': () => this.profile?.name,
      'orcid': () => this.profile?.orcid,
      
      // Paper/DOI fields - use last paper if accessed recently
      'paper': () => this.getRecentValue('paper', 5 * 60 * 1000), // 5 min
      'doi': () => this.getRecentValue('doi', 5 * 60 * 1000),
      'article': () => this.getRecentValue('article', 5 * 60 * 1000),
      
      // Date fields
      'date': () => new Date().toISOString().split('T')[0],
      'year': () => new Date().getFullYear().toString(),
      
      // Common URIs
      'license': () => 'https://creativecommons.org/licenses/by/4.0/',
    };

    const key = placeholder.id.toLowerCase();
    if (autoFills[key]) {
      return autoFills[key]();
    }

    // Priority 3: Check last-used values
    return this.getRecentValue(placeholder.id, 30 * 60 * 1000); // 30 min
  }

  /**
   * Get recently used value if within time threshold
   */
  getRecentValue(fieldId, maxAge) {
    const stored = this.lastUsed[fieldId];
    if (!stored) return null;
    
    const age = Date.now() - stored.timestamp;
    if (age > maxAge) return null;
    
    return stored.value;
  }

  /**
   * Smart suggestions based on field type and context
   */
  getSuggestions(placeholder, currentValue) {
    const suggestions = [];

    // For DOI fields, suggest format
    if (placeholder.id.toLowerCase().includes('doi') || 
        placeholder.id.toLowerCase().includes('paper')) {
      if (!currentValue || currentValue.length < 3) {
        suggestions.push({
          text: '10.',
          hint: 'DOIs always start with "10."',
          action: () => '10.'
        });
      }
    }

    // For WKT geometry fields, suggest common formats
    if (placeholder.id.toLowerCase().includes('wkt')) {
      suggestions.push(
        {
          text: 'POINT format',
          hint: 'POINT(longitude latitude)',
          action: () => 'POINT(0.0 0.0)'
        },
        {
          text: 'POLYGON format',
          hint: 'POLYGON((lon lat, lon lat, ...))',
          action: () => 'POLYGON((0.0 0.0, 1.0 0.0, 1.0 1.0, 0.0 1.0, 0.0 0.0))'
        }
      );
    }

    return suggestions;
  }

  /**
   * Context-aware auto-complete for related fields
   * Generate identifiers dynamically from user input
   */
  getContextualValue(placeholder, formData) {
    // Generate location identifier FROM location name
    if (placeholder.id === 'location' && formData['location-label']) {
      return this.generateIdentifier(formData['location-label']);
    }

    // Generate geometry identifier FROM location identifier
    if (placeholder.id === 'geometry' && formData['location']) {
      return formData['location'] + '-geometry';
    }

    // Suggest formatted label FROM location identifier (reverse)
    if (placeholder.id === 'location-label' && formData['location']) {
      const id = formData['location'];
      // Convert "amazon-basin-brazil" -> "Amazon Basin Brazil"
      return id.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    return null;
  }

  /**
   * Generate URL-safe identifier from human-readable text
   * @param {string} text - Human-readable location name
   * @returns {string} URL-safe identifier
   */
  generateIdentifier(text) {
    if (!text || !text.trim()) return '';
    
    return text
      .toLowerCase()
      .normalize('NFD')                    // Decompose accented chars
      .replace(/[\u0300-\u036f]/g, '')    // Remove diacritics (São → Sao)
      .replace(/[^\w\s-]/g, '')           // Keep only word chars, spaces, dashes
      .trim()
      .replace(/\s+/g, '-')               // Spaces to dashes
      .replace(/--+/g, '-')               // Multiple dashes to single
      .replace(/^-+|-+$/g, '')            // Remove leading/trailing dashes
      .substring(0, 50);                  // Limit length
  }
  
  /**
   * Examples of generateIdentifier():
   * "Northern Europe" → "northern-europe"
   * "São Paulo" → "sao-paulo"
   * "Amazon Basin, Brazil" → "amazon-basin-brazil"
   * "Italian Alps (Piedmont)" → "italian-alps-piedmont"
   * "Sub-Saharan  Africa" → "sub-saharan-africa"
   */
}

/**
 * Integration with formGenerator.js
 * 
 * In the renderInput() method, enhance each input field:
 */
function enhanceInputWithAutoFill(input, placeholder, statement, formData) {
  const autoFill = new AutoFillManager();
  
  // 1. Set auto-fill value if available
  const autoValue = autoFill.getAutoFillValue(placeholder, statement);
  if (autoValue && !input.value) {
    input.value = autoValue;
    input.classList.add('auto-filled');
    input.dataset.autoFilled = 'true';
    
    // Add visual indicator
    const indicator = document.createElement('span');
    indicator.className = 'auto-fill-indicator';
    indicator.textContent = '✓ auto-filled';
    indicator.style.cssText = `
      font-size: 0.75em;
      color: #059669;
      margin-left: 8px;
      font-weight: 500;
    `;
    input.parentElement.querySelector('label')?.appendChild(indicator);
  }

  // 2. SPECIAL: Live identifier preview for location-label field
  if (placeholder.id === 'location-label') {
    const previewEl = document.createElement('div');
    previewEl.className = 'identifier-preview';
    previewEl.style.cssText = `
      font-size: 0.85em;
      color: #6b7280;
      margin-top: 8px;
      padding: 8px 12px;
      background: #f9fafb;
      border-radius: 4px;
      border-left: 3px solid #be2e78;
      display: none;
    `;
    
    // Update preview as user types
    input.addEventListener('input', (e) => {
      const identifier = autoFill.generateIdentifier(e.target.value);
      
      if (identifier) {
        previewEl.innerHTML = `💡 Will create identifier: <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace;">${identifier}</code>`;
        previewEl.style.display = 'block';
        
        // Auto-fill the location identifier field if it's empty or was auto-filled
        const locationField = document.querySelector('[name$="_subject"][id*="location"]');
        if (locationField && (!locationField.value || locationField.dataset.autoFilled)) {
          locationField.value = identifier;
          locationField.dataset.autoFilled = 'true';
          locationField.classList.add('auto-filled');
        }
      } else {
        previewEl.style.display = 'none';
      }
    });
    
    input.parentElement.appendChild(previewEl);
    
    // Trigger once if field already has value
    if (input.value) {
      input.dispatchEvent(new Event('input'));
    }
  }

  // 3. Add contextual suggestions
  const contextValue = autoFill.getContextualValue(placeholder, formData);
  if (contextValue && !input.value) {
    const suggestionBtn = document.createElement('button');
    suggestionBtn.type = 'button';
    suggestionBtn.className = 'btn-suggestion';
    suggestionBtn.innerHTML = `💡 Use: "<strong>${contextValue}</strong>"`;
    suggestionBtn.style.cssText = `
      font-size: 0.85em;
      padding: 8px 12px;
      background: #f0fdf4;
      border: 1px solid #86efac;
      border-radius: 4px;
      color: #059669;
      cursor: pointer;
      margin-top: 8px;
      transition: all 0.2s;
      font-family: inherit;
    `;
    suggestionBtn.onmouseover = () => {
      suggestionBtn.style.background = '#dcfce7';
      suggestionBtn.style.transform = 'translateY(-1px)';
    };
    suggestionBtn.onmouseout = () => {
      suggestionBtn.style.background = '#f0fdf4';
      suggestionBtn.style.transform = 'translateY(0)';
    };
    suggestionBtn.onclick = () => {
      input.value = contextValue;
      input.dataset.autoFilled = 'true';
      input.classList.add('auto-filled');
      suggestionBtn.remove();
      input.focus();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    input.parentElement.appendChild(suggestionBtn);
  }

  // 4. Remove auto-fill indicator when user manually edits
  input.addEventListener('focus', () => {
    if (input.dataset.autoFilled) {
      // Show subtle hint
      const hint = document.createElement('div');
      hint.className = 'edit-hint';
      hint.textContent = 'Auto-generated - edit if needed';
      hint.style.cssText = `
        font-size: 0.8em;
        color: #6b7280;
        margin-top: 4px;
        font-style: italic;
      `;
      if (!input.parentElement.querySelector('.edit-hint')) {
        input.parentElement.appendChild(hint);
      }
    }
  });
  
  input.addEventListener('input', () => {
    if (input.dataset.autoFilled && input.value !== input.dataset.originalAutoValue) {
      // User is editing auto-filled value
      delete input.dataset.autoFilled;
      input.classList.remove('auto-filled');
      const indicator = input.parentElement.querySelector('.auto-fill-indicator');
      if (indicator) indicator.remove();
      const hint = input.parentElement.querySelector('.edit-hint');
      if (hint) hint.remove();
    }
  });

  // 5. Remember value on change
  input.addEventListener('change', () => {
    autoFill.rememberValue(placeholder.id, input.value);
  });

  // 6. Add autocomplete datalist for common values
  if (placeholder.id.toLowerCase().includes('doi') || 
      placeholder.id.toLowerCase().includes('paper')) {
    const datalist = document.createElement('datalist');
    datalist.id = `suggestions-${placeholder.id}`;
    
    // Add recent DOIs
    Object.entries(autoFill.lastUsed)
      .filter(([key]) => key.includes('paper') || key.includes('doi'))
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, 5)
      .forEach(([key, data]) => {
        const option = document.createElement('option');
        option.value = data.value;
        datalist.appendChild(option);
      });
    
    if (datalist.children.length > 0) {
      input.setAttribute('list', datalist.id);
      input.parentElement.appendChild(datalist);
      
      // Add hint about autocomplete
      const hint = document.createElement('div');
      hint.className = 'autocomplete-hint';
      hint.textContent = '💡 Recent values available - start typing to see suggestions';
      hint.style.cssText = `
        font-size: 0.8em;
        color: #6b7280;
        margin-top: 4px;
      `;
      input.parentElement.appendChild(hint);
    }
  }

  return input;
}

export default FormGenerator;
export { AutoFillManager, enhanceInputWithAutoFill };
