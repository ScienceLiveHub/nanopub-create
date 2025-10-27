/**
 * Field rendering components for different placeholder types
 * Extracted from formGenerator.js (lines 10-215)
 */

export const FieldComponents = {
  
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
