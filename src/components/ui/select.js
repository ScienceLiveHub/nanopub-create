/**
 * Select Component
 * Vanilla JS select dropdown
 * Uses Tailwind utility classes from tailwind.base.css
 */

import { cn } from '../../utils/cn.js';

/**
 * Create a select element
 * 
 * @param {Object} options - Select configuration
 * @param {string} options.name - Select name attribute
 * @param {string} options.id - Select id attribute
 * @param {string|number} options.value - Selected value
 * @param {Array<{value: string, label: string, disabled?: boolean}>} options.items - Select options
 * @param {string} options.placeholder - Placeholder option text
 * @param {boolean} options.required - Whether select is required
 * @param {boolean} options.disabled - Whether select is disabled
 * @param {string} options.className - Additional CSS classes
 * @param {Function} options.onChange - Change event handler
 * @param {'valid'|'invalid'|null} options.validationState - Validation state
 * @param {Object} options.attrs - Additional HTML attributes
 * @returns {HTMLSelectElement} Select element
 * 
 * @example
 * const select = createSelect({
 *   items: [
 *     { value: 'option1', label: 'Option 1' },
 *     { value: 'option2', label: 'Option 2' }
 *   ],
 *   placeholder: 'Select an option',
 *   onChange: (e) => console.log(e.target.value)
 * });
 */
export function createSelect(options = {}) {
  const {
    name,
    id,
    value,
    items = [],
    placeholder,
    required = false,
    disabled = false,
    className,
    onChange,
    validationState = null,
    attrs = {}
  } = options;

  const select = document.createElement('select');
  
  // Combine classes with validation state
  select.className = cn(
    'field-select', // Base Tailwind utility from tailwind.base.css
    validationState === 'valid' && 'field-valid',
    validationState === 'invalid' && 'field-invalid',
    className
  );
  
  // Set attributes
  if (name) select.name = name;
  if (id) select.id = id;
  if (required) select.required = true;
  if (disabled) select.disabled = true;
  
  // Add placeholder option if provided
  if (placeholder) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    placeholderOption.selected = !value;
    select.appendChild(placeholderOption);
  }
  
  // Add options
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    if (item.disabled) option.disabled = true;
    if (value !== undefined && item.value === value) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  // Attach change handler
  if (onChange) {
    select.addEventListener('change', onChange);
  }
  
  // Set additional attributes
  Object.entries(attrs).forEach(([key, val]) => {
    select.setAttribute(key, val);
  });
  
  return select;
}

/**
 * Create a select with label wrapper
 * 
 * @param {Object} options - Configuration
 * @param {string} options.label - Label text
 * @param {Object} options.selectOptions - Options to pass to createSelect
 * @param {string} options.helpText - Optional help text below select
 * @param {string} options.errorText - Optional error message
 * @param {boolean} options.optional - Show optional badge
 * @param {string} options.className - Additional CSS classes for wrapper
 * @returns {HTMLDivElement} Select field container
 */
export function createSelectField(options = {}) {
  const {
    label,
    selectOptions = {},
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
    
    if (selectOptions.id) {
      labelEl.htmlFor = selectOptions.id;
    }
    
    container.appendChild(labelEl);
  }
  
  // Create select
  const select = createSelect(selectOptions);
  container.appendChild(select);
  
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
 * Create a select with option groups
 * 
 * @param {Object} options - Configuration
 * @param {string} options.name - Select name
 * @param {string} options.id - Select id
 * @param {Array<{label: string, options: Array<{value: string, label: string}>}>} options.groups - Option groups
 * @param {string} options.placeholder - Placeholder text
 * @param {Function} options.onChange - Change handler
 * @param {string} options.className - Additional classes
 * @returns {HTMLSelectElement} Select with optgroups
 */
export function createGroupedSelect(options = {}) {
  const {
    name,
    id,
    groups = [],
    placeholder,
    onChange,
    className,
    value
  } = options;

  const select = document.createElement('select');
  select.className = cn('field-select', className);
  
  if (name) select.name = name;
  if (id) select.id = id;
  
  // Add placeholder
  if (placeholder) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    placeholderOption.selected = !value;
    select.appendChild(placeholderOption);
  }
  
  // Add option groups
  groups.forEach(group => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.label;
    
    group.options.forEach(item => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      if (value !== undefined && item.value === value) {
        option.selected = true;
      }
      optgroup.appendChild(option);
    });
    
    select.appendChild(optgroup);
  });
  
  if (onChange) {
    select.addEventListener('change', onChange);
  }
  
  return select;
}
