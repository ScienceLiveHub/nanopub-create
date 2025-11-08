/**
 * Field rendering components for different placeholder types
 * Updated to use UI component library
 */

import { createInput, createTextarea, createSelect } from './ui/index.js';

export const FieldComponents = {
  
  'LiteralPlaceholder': (placeholder) => {
    return createInput({
      type: 'text',
      placeholder: placeholder.label || '',
      attrs: placeholder.validation?.regex ? { pattern: placeholder.validation.regex } : {}
    });
  },
  
  'LongLiteralPlaceholder': (placeholder) => {
    return createTextarea({
      rows: 5,
      placeholder: placeholder.label || ''
    });
  },
  
  'ExternalUriPlaceholder': (placeholder) => {
    return createInput({
      type: 'url',
      placeholder: placeholder.label || 'https://...'
    });
  },
  
  'UriPlaceholder': (placeholder) => {
    return createInput({
      type: 'url',
      placeholder: placeholder.label || 'https://...'
    });
  },
  
  'TrustyUriPlaceholder': (placeholder) => {
    return createInput({
      type: 'url',
      placeholder: placeholder.label || 'https://...'
    });
  },
  
  'RestrictedChoicePlaceholder': (placeholder) => {
    console.log(`[RestrictedChoice] Rendering ${placeholder.id} with ${placeholder.options?.length || 0} options`);
    
    const items = [];
    
    // Convert options to items array
    if (placeholder.options && Array.isArray(placeholder.options)) {
      placeholder.options.forEach(opt => {
        items.push({
          value: opt.value || opt,
          label: opt.label || opt.value || opt
        });
      });
    } else {
      console.warn(`[RestrictedChoice] No options found for ${placeholder.id}`);
    }
    
    return createSelect({
      items,
      placeholder: items.length > 1 ? 'Select...' : undefined,
      value: items.length === 1 ? items[0].value : undefined
    });
  },
  
  'GuidedChoicePlaceholder': (placeholder) => {
    return createInput({
      type: 'text',
      placeholder: placeholder.label || 'Type to search...',
      attrs: { 'data-guided-choice': 'true' }
    });
  },
  
  'IntroducedResource': (placeholder) => {
    return createInput({
      type: 'text',
      placeholder: placeholder.label || 'Enter identifier'
    });
  },
  
  'LocalResource': (placeholder) => {
    return createInput({
      type: 'text',
      placeholder: placeholder.label || 'Enter identifier'
    });
  },
  
  'ValuePlaceholder': (placeholder) => {
    return createInput({
      type: 'text',
      placeholder: placeholder.label || 'Enter value'
    });
  },
  
  'AutoEscapeUriPlaceholder': (placeholder) => {
    return createInput({
      type: 'text',
      placeholder: placeholder.label || ''
    });
  },
  
  'AgentPlaceholder': (placeholder) => {
    return createInput({
      type: 'url',
      placeholder: placeholder.label || 'https://orcid.org/...'
    });
  }
};
