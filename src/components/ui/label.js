/**
 * Label Component
 * Vanilla JS label with optional badge support
 * Uses Tailwind utility classes from tailwind.base.css
 */

import { cn } from '../../utils/cn.js';

/**
 * Create a label element
 * 
 * @param {Object} options - Label configuration
 * @param {string} options.text - Label text content
 * @param {string} options.htmlFor - Associated input id
 * @param {boolean} options.required - Show required indicator
 * @param {boolean} options.optional - Show optional badge
 * @param {string} options.className - Additional CSS classes
 * @param {Object} options.attrs - Additional HTML attributes
 * @returns {HTMLLabelElement} Label element
 * 
 * @example
 * const label = createLabel({
 *   text: 'Email Address',
 *   htmlFor: 'email-input',
 *   required: true
 * });
 */
export function createLabel(options = {}) {
  const {
    text,
    htmlFor,
    required = false,
    optional = false,
    className,
    attrs = {}
  } = options;

  const label = document.createElement('label');
  label.className = cn('field-label', className);
  
  if (htmlFor) {
    label.htmlFor = htmlFor;
  }
  
  // Add main text
  if (text) {
    const textNode = document.createTextNode(text);
    label.appendChild(textNode);
  }
  
  // Add required indicator
  if (required) {
    const required_span = document.createElement('span');
    required_span.className = 'text-error ml-1';
    required_span.textContent = '*';
    required_span.setAttribute('aria-label', 'required');
    label.appendChild(required_span);
  }
  
  // Add optional badge
  if (optional) {
    const badge = document.createElement('span');
    badge.className = 'optional-badge';
    badge.textContent = 'optional';
    label.appendChild(badge);
  }
  
  // Set additional attributes
  Object.entries(attrs).forEach(([key, value]) => {
    label.setAttribute(key, value);
  });
  
  return label;
}

/**
 * Create a fieldset with legend (for grouping related fields)
 * 
 * @param {Object} options - Fieldset configuration
 * @param {string} options.legend - Legend text
 * @param {HTMLElement[]} options.fields - Array of field elements
 * @param {string} options.className - Additional CSS classes
 * @param {boolean} options.disabled - Disable all fields in group
 * @returns {HTMLFieldSetElement} Fieldset element
 */
export function createFieldset(options = {}) {
  const {
    legend,
    fields = [],
    className,
    disabled = false
  } = options;

  const fieldset = document.createElement('fieldset');
  fieldset.className = cn('border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4', className);
  
  if (disabled) {
    fieldset.disabled = true;
  }
  
  // Add legend if provided
  if (legend) {
    const legendEl = document.createElement('legend');
    legendEl.className = 'field-label px-2';
    legendEl.textContent = legend;
    fieldset.appendChild(legendEl);
  }
  
  // Add fields
  fields.forEach(field => {
    fieldset.appendChild(field);
  });
  
  return fieldset;
}
