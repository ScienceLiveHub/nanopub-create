/**
 * Textarea Component
 * Vanilla JS textarea with auto-resize support
 * Uses Tailwind utility classes from tailwind.base.css
 */

import { cn } from '../../utils/cn.js';

/**
 * Create a textarea element
 * 
 * @param {Object} options - Textarea configuration
 * @param {string} options.name - Textarea name attribute
 * @param {string} options.id - Textarea id attribute
 * @param {string} options.value - Textarea value
 * @param {string} options.placeholder - Placeholder text
 * @param {number} options.rows - Number of visible rows (default: 4)
 * @param {boolean} options.required - Whether textarea is required
 * @param {boolean} options.disabled - Whether textarea is disabled
 * @param {boolean} options.readonly - Whether textarea is readonly
 * @param {boolean} options.autoResize - Enable auto-resize on input
 * @param {string} options.className - Additional CSS classes
 * @param {Function} options.onChange - Change event handler
 * @param {Function} options.onInput - Input event handler
 * @param {'valid'|'invalid'|null} options.validationState - Validation state
 * @param {Object} options.attrs - Additional HTML attributes
 * @returns {HTMLTextAreaElement} Textarea element
 * 
 * @example
 * const textarea = createTextarea({
 *   placeholder: 'Enter description',
 *   rows: 6,
 *   autoResize: true,
 *   onChange: (e) => console.log(e.target.value)
 * });
 */
export function createTextarea(options = {}) {
  const {
    name,
    id,
    value,
    placeholder,
    rows = 4,
    required = false,
    disabled = false,
    readonly = false,
    autoResize = false,
    className,
    onChange,
    onInput,
    validationState = null,
    attrs = {}
  } = options;

  const textarea = document.createElement('textarea');
  
  // Combine classes with validation state
  textarea.className = cn(
    'field-textarea', // Base Tailwind utility from tailwind.base.css
    validationState === 'valid' && 'field-valid',
    validationState === 'invalid' && 'field-invalid',
    className
  );
  
  // Set attributes
  if (name) textarea.name = name;
  if (id) textarea.id = id;
  if (value !== undefined) textarea.value = value;
  if (placeholder) textarea.placeholder = placeholder;
  textarea.rows = rows;
  if (required) textarea.required = true;
  if (disabled) textarea.disabled = true;
  if (readonly) textarea.readOnly = true;
  
  // Auto-resize functionality
  if (autoResize) {
    const autoResizeHandler = () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };
    
    textarea.addEventListener('input', autoResizeHandler);
    
    // Initial resize
    setTimeout(autoResizeHandler, 0);
  }
  
  // Attach event handlers
  if (onChange) textarea.addEventListener('change', onChange);
  if (onInput) textarea.addEventListener('input', onInput);
  
  // Set additional attributes
  Object.entries(attrs).forEach(([key, value]) => {
    textarea.setAttribute(key, value);
  });
  
  return textarea;
}

/**
 * Create a textarea with label wrapper
 * 
 * @param {Object} options - Configuration
 * @param {string} options.label - Label text
 * @param {Object} options.textareaOptions - Options to pass to createTextarea
 * @param {string} options.helpText - Optional help text below textarea
 * @param {string} options.errorText - Optional error message
 * @param {boolean} options.optional - Show optional badge
 * @param {number} options.maxLength - Maximum character count
 * @param {boolean} options.showCharCount - Show character counter
 * @param {string} options.className - Additional CSS classes for wrapper
 * @returns {HTMLDivElement} Textarea field container
 */
export function createTextareaField(options = {}) {
  const {
    label,
    textareaOptions = {},
    helpText,
    errorText,
    optional = false,
    maxLength,
    showCharCount = false,
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
    
    if (textareaOptions.id) {
      labelEl.htmlFor = textareaOptions.id;
    }
    
    container.appendChild(labelEl);
  }
  
  // Add maxLength to textarea options if provided
  if (maxLength) {
    textareaOptions.attrs = {
      ...textareaOptions.attrs,
      maxlength: maxLength
    };
  }
  
  // Create textarea
  const textarea = createTextarea(textareaOptions);
  container.appendChild(textarea);
  
  // Create footer for help text and char count
  const footer = document.createElement('div');
  footer.className = 'flex justify-between items-center mt-1';
  
  // Add help text if provided
  if (helpText) {
    const help = document.createElement('p');
    help.className = 'field-help text-sm flex-1';
    help.textContent = helpText;
    footer.appendChild(help);
  }
  
  // Add character counter if requested
  if (showCharCount && maxLength) {
    const counter = document.createElement('span');
    counter.className = 'text-sm text-gray-500 dark:text-gray-400';
    
    const updateCounter = () => {
      const current = textarea.value.length;
      counter.textContent = `${current}/${maxLength}`;
      
      // Change color if approaching limit
      if (current > maxLength * 0.9) {
        counter.className = 'text-sm text-warning';
      } else {
        counter.className = 'text-sm text-gray-500 dark:text-gray-400';
      }
    };
    
    textarea.addEventListener('input', updateCounter);
    updateCounter();
    
    footer.appendChild(counter);
  }
  
  if (footer.children.length > 0) {
    container.appendChild(footer);
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
