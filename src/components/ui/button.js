/**
 * Button Component
 * Vanilla JS button with variants following shadcn patterns
 * Uses Tailwind utility classes from tailwind.base.css
 */

import { cn } from '../../utils/cn.js';

/**
 * Button variants
 * Maps to Tailwind utilities defined in tailwind.base.css
 */
const buttonVariants = {
  primary: 'submit-button',
  secondary: 'button-secondary',
  add: 'button-add',
  remove: 'button-remove',
  outline: 'px-3 py-2 border-2 border-nanopub-primary text-nanopub-primary hover:bg-nanopub-primary hover:text-white rounded-lg transition-all font-semibold',
  ghost: 'px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all',
  link: 'text-nanopub-primary hover:underline',
};

/**
 * Button sizes
 */
const buttonSizes = {
  sm: 'text-sm px-3 py-1.5',
  default: 'px-4 py-2',
  lg: 'text-lg px-6 py-3',
  icon: 'p-2',
};

/**
 * Create a button element
 * 
 * @param {Object} options - Button configuration
 * @param {string} options.variant - Button variant ('primary', 'secondary', 'add', 'remove', 'outline', 'ghost', 'link')
 * @param {string} options.size - Button size ('sm', 'default', 'lg', 'icon')
 * @param {string} options.label - Button text content
 * @param {string} options.type - Button type attribute (default: 'button')
 * @param {boolean} options.disabled - Whether button is disabled
 * @param {Function} options.onClick - Click event handler
 * @param {string} options.className - Additional CSS classes
 * @param {string} options.icon - Icon HTML/text to prepend
 * @param {string} options.iconPosition - Icon position ('left' or 'right')
 * @param {Object} options.attrs - Additional HTML attributes
 * @returns {HTMLButtonElement} Button element
 * 
 * @example
 * const btn = createButton({
 *   variant: 'primary',
 *   label: 'Submit',
 *   onClick: () => console.log('clicked')
 * });
 */
export function createButton(options = {}) {
  const {
    variant = 'primary',
    size = 'default',
    label = '',
    type = 'button',
    disabled = false,
    onClick,
    className,
    icon,
    iconPosition = 'left',
    attrs = {}
  } = options;

  const button = document.createElement('button');
  button.type = type;
  
  // Combine classes
  button.className = cn(
    buttonVariants[variant] || buttonVariants.primary,
    buttonSizes[size],
    className
  );
  
  // Add icon if provided
  if (icon) {
    const iconSpan = document.createElement('span');
    iconSpan.innerHTML = icon;
    iconSpan.className = iconPosition === 'left' ? 'mr-2' : 'ml-2';
    
    if (iconPosition === 'left') {
      button.appendChild(iconSpan);
    }
  }
  
  // Add label
  if (label) {
    const textNode = document.createTextNode(label);
    button.appendChild(textNode);
  }
  
  // Add icon after label if right position
  if (icon && iconPosition === 'right') {
    const iconSpan = document.createElement('span');
    iconSpan.innerHTML = icon;
    iconSpan.className = 'ml-2';
    button.appendChild(iconSpan);
  }
  
  // Set disabled state
  if (disabled) {
    button.disabled = true;
  }
  
  // Attach click handler
  if (onClick) {
    button.addEventListener('click', onClick);
  }
  
  // Set additional attributes
  Object.entries(attrs).forEach(([key, value]) => {
    button.setAttribute(key, value);
  });
  
  return button;
}

/**
 * Create a button group container
 * 
 * @param {Object} options - Button group configuration
 * @param {HTMLButtonElement[]} options.buttons - Array of button elements
 * @param {string} options.className - Additional CSS classes
 * @returns {HTMLDivElement} Button group container
 */
export function createButtonGroup(options = {}) {
  const { buttons = [], className } = options;
  
  const group = document.createElement('div');
  group.className = cn('flex gap-2', className);
  
  buttons.forEach(button => group.appendChild(button));
  
  return group;
}
