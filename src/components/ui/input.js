/**
 * Input Component
 * Vanilla JS input with validation states
 * Uses Tailwind utility classes from tailwind.base.css
 */

import { cn } from '../../utils/cn.js';

/**
 * Create an input element
 * 
 * @param {Object} options - Input configuration
 * @param {string} options.type - Input type (default: 'text')
 * @param {string} options.name - Input name attribute
 * @param {string} options.id - Input id attribute
 * @param {string} options.value - Input value
 * @param {string} options.placeholder - Placeholder text
 * @param {boolean} options.required - Whether input is required
 * @param {boolean} options.disabled - Whether input is disabled
 * @param {boolean} options.readonly - Whether input is readonly
 * @param {string} options.className - Additional CSS classes
 * @param {Function} options.onChange - Change event handler
 * @param {Function} options.onInput - Input event handler
 * @param {Function} options.onBlur - Blur event handler
 * @param {Function} options.onFocus - Focus event handler
 * @param {'valid'|'invalid'|null} options.validationState - Validation state
 * @param {Object} options.attrs - Additional HTML attributes
 * @returns {HTMLInputElement} Input element
 * 
 * @example
 * const input = createInput({
 *   type: 'email',
 *   placeholder: 'Enter email',
 *   required: true,
 *   onChange: (e) => console.log(e.target.value)
 * });
 */
export function createInput(options = {}) {
  const {
    type = 'text',
    name,
    id,
    value,
    placeholder,
    required = false,
    disabled = false,
    readonly = false,
    className,
    onChange,
    onInput,
    onBlur,
    onFocus,
    validationState = null,
    attrs = {}
  } = options;

  const input = document.createElement('input');
  input.type = type;
  
  // Combine classes with validation state
  input.className = cn(
    'field-input', // Base Tailwind utility from tailwind.base.css
    validationState === 'valid' && 'field-valid',
    validationState === 'invalid' && 'field-invalid',
    className
  );
  
  // Set attributes
  if (name) input.name = name;
  if (id) input.id = id;
  if (value !== undefined) input.value = value;
  if (placeholder) input.placeholder = placeholder;
  if (required) input.required = true;
  if (disabled) input.disabled = true;
  if (readonly) input.readOnly = true;
  
  // Attach event handlers
  if (onChange) input.addEventListener('change', onChange);
  if (onInput) input.addEventListener('input', onInput);
  if (onBlur) input.addEventListener('blur', onBlur);
  if (onFocus) input.addEventListener('focus', onFocus);
  
  // Set additional attributes
  Object.entries(attrs).forEach(([key, value]) => {
    input.setAttribute(key, value);
  });
  
  return input;
}

/**
 * Create an input with label wrapper
 * 
 * @param {Object} options - Configuration
 * @param {string} options.label - Label text
 * @param {Object} options.inputOptions - Options to pass to createInput
 * @param {string} options.helpText - Optional help text below input
 * @param {string} options.errorText - Optional error message
 * @param {boolean} options.optional - Show optional badge
 * @param {string} options.className - Additional CSS classes for wrapper
 * @returns {HTMLDivElement} Input field container
 */
export function createInputField(options = {}) {
  const {
    label,
    inputOptions = {},
    helpText,
    errorText,
    optional = false,
    className
  } = options;

  const container = document.createElement('div');
  container.className = cn('field-container', className);
  
  // Create label if provided
  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'field-label';
    labelEl.textContent = label;
    
    // Add optional badge if needed
    if (optional) {
      const badge = document.createElement('span');
      badge.className = 'optional-badge';
      badge.textContent = 'optional';
      labelEl.appendChild(badge);
    }
    
    if (inputOptions.id) {
      labelEl.htmlFor = inputOptions.id;
    }
    
    container.appendChild(labelEl);
  }
  
  // Create input
  const input = createInput(inputOptions);
  container.appendChild(input);
  
  // Add help text if provided
  if (helpText) {
    const help = document.createElement('p');
    help.className = 'field-help';
    help.textContent = helpText;
    container.appendChild(help);
  }
  
  // Add error text if provided
  if (errorText) {
    const error = document.createElement('p');
    error.className = 'text-error text-sm mt-1';
    error.textContent = errorText;
    container.appendChild(error);
  }
  
  return container;
}

/**
 * Create a URL input with validation
 * 
 * @param {Object} options - Options to pass to createInput
 * @returns {HTMLInputElement} URL input element
 */
export function createUrlInput(options = {}) {
  return createInput({
    type: 'url',
    placeholder: 'https://example.org/...',
    ...options
  });
}

/**
 * Create an email input with validation
 * 
 * @param {Object} options - Options to pass to createInput
 * @returns {HTMLInputElement} Email input element
 */
export function createEmailInput(options = {}) {
  return createInput({
    type: 'email',
    placeholder: 'email@example.com',
    ...options
  });
}
