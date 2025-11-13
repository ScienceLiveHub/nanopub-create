/**
 * Badge Component
 * Vanilla JS badge/pill component
 */

import { cn } from '../../utils/cn.js';

/**
 * Badge variants
 */
const badgeVariants = {
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  primary: 'bg-nanopub-primary text-white',
  secondary: 'bg-nanopub-secondary text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-white',
  error: 'bg-error text-white',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  optional: 'optional-badge', // Uses the Tailwind utility from tailwind.base.css
};

/**
 * Create a badge element
 * 
 * @param {Object} options - Badge configuration
 * @param {string} options.text - Badge text content
 * @param {string} options.variant - Badge variant
 * @param {string} options.className - Additional CSS classes
 * @param {Function} options.onClick - Optional click handler (for removable badges)
 * @param {boolean} options.removable - Show close button
 * @param {Function} options.onRemove - Remove button click handler
 * @returns {HTMLSpanElement} Badge element
 * 
 * @example
 * const badge = createBadge({
 *   text: 'New',
 *   variant: 'primary'
 * });
 */
export function createBadge(options = {}) {
  const {
    text,
    variant = 'default',
    className,
    onClick,
    removable = false,
    onRemove
  } = options;

  const badge = document.createElement('span');
  
  badge.className = cn(
    'inline-flex items-center px-2 py-1 text-xs font-semibold rounded',
    badgeVariants[variant] || badgeVariants.default,
    onClick && 'cursor-pointer hover:opacity-80',
    className
  );
  
  // Add text
  if (text) {
    const textNode = document.createTextNode(text);
    badge.appendChild(textNode);
  }
  
  // Add remove button if requested
  if (removable) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5';
    removeBtn.innerHTML = '×';
    removeBtn.setAttribute('aria-label', 'Remove');
    
    if (onRemove) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onRemove(e);
      });
    }
    
    badge.appendChild(removeBtn);
  }
  
  // Attach click handler
  if (onClick) {
    badge.addEventListener('click', onClick);
  }
  
  return badge;
}

/**
 * Create a status indicator badge (dot + text)
 * 
 * @param {Object} options - Status badge configuration
 * @param {string} options.text - Status text
 * @param {string} options.status - Status type ('active', 'inactive', 'pending', 'error')
 * @param {string} options.className - Additional CSS classes
 * @returns {HTMLSpanElement} Status badge
 */
export function createStatusBadge(options = {}) {
  const {
    text,
    status = 'default',
    className
  } = options;

  const statusColors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    pending: 'bg-yellow-500',
    error: 'bg-red-500',
    default: 'bg-gray-400'
  };

  const badge = document.createElement('span');
  badge.className = cn(
    'inline-flex items-center gap-1.5 px-2 py-1 text-sm rounded-full',
    'bg-gray-100 dark:bg-gray-800',
    className
  );
  
  // Add status dot
  const dot = document.createElement('span');
  dot.className = cn(
    'w-2 h-2 rounded-full',
    statusColors[status] || statusColors.default
  );
  badge.appendChild(dot);
  
  // Add text
  if (text) {
    const textSpan = document.createElement('span');
    textSpan.textContent = text;
    badge.appendChild(textSpan);
  }
  
  return badge;
}
