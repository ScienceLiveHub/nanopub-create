/**
 * Alert Component
 * Vanilla JS alert/notification component
 */

import { cn } from '../../utils/cn.js';

/**
 * Alert variants
 */
const alertVariants = {
  default: {
    container: 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100',
    icon: 'ℹ️'
  },
  info: {
    container: 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100',
    icon: 'ℹ️'
  },
  success: {
    container: 'bg-green-50 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-100',
    icon: '✓'
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-100',
    icon: '⚠️'
  },
  error: {
    container: 'bg-red-50 border-red-300 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
    icon: '✕'
  }
};

/**
 * Create an alert element
 * 
 * @param {Object} options - Alert configuration
 * @param {string} options.title - Alert title
 * @param {string} options.message - Alert message
 * @param {string} options.variant - Alert variant ('default', 'info', 'success', 'warning', 'error')
 * @param {boolean} options.dismissible - Show close button
 * @param {Function} options.onDismiss - Dismiss callback
 * @param {string} options.className - Additional CSS classes
 * @returns {HTMLDivElement} Alert element
 * 
 * @example
 * const alert = createAlert({
 *   title: 'Success',
 *   message: 'Your nanopublication was created!',
 *   variant: 'success',
 *   dismissible: true
 * });
 */
export function createAlert(options = {}) {
  const {
    title,
    message,
    variant = 'default',
    dismissible = false,
    onDismiss,
    className
  } = options;

  const variantConfig = alertVariants[variant] || alertVariants.default;

  const alert = document.createElement('div');
  alert.className = cn(
    'border-2 rounded-lg p-4 flex items-start gap-3',
    variantConfig.container,
    className
  );
  
  // Add icon
  const iconContainer = document.createElement('div');
  iconContainer.className = 'flex-shrink-0 text-xl';
  iconContainer.textContent = variantConfig.icon;
  alert.appendChild(iconContainer);
  
  // Add content
  const content = document.createElement('div');
  content.className = 'flex-1';
  
  if (title) {
    const titleEl = document.createElement('h4');
    titleEl.className = 'font-semibold mb-1';
    titleEl.textContent = title;
    content.appendChild(titleEl);
  }
  
  if (message) {
    const messageEl = document.createElement('p');
    messageEl.className = 'text-sm';
    messageEl.textContent = message;
    content.appendChild(messageEl);
  }
  
  alert.appendChild(content);
  
  // Add dismiss button if requested
  if (dismissible) {
    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'flex-shrink-0 hover:opacity-70 transition-opacity';
    dismissBtn.innerHTML = '×';
    dismissBtn.setAttribute('aria-label', 'Dismiss');
    
    dismissBtn.addEventListener('click', () => {
      alert.remove();
      if (onDismiss) onDismiss();
    });
    
    alert.appendChild(dismissBtn);
  }
  
  return alert;
}

/**
 * Create a loading alert
 * 
 * @param {Object} options - Loading alert configuration
 * @param {string} options.message - Loading message
 * @param {string} options.className - Additional CSS classes
 * @returns {HTMLDivElement} Loading alert element
 */
export function createLoadingAlert(options = {}) {
  const {
    message = 'Loading...',
    className
  } = options;

  const alert = document.createElement('div');
  alert.className = cn(
    'loading-state', // Uses Tailwind utility from tailwind.base.css
    className
  );
  
  // Add spinner
  const spinner = document.createElement('div');
  spinner.className = 'inline-block w-4 h-4 border-2 border-gray-300 border-t-nanopub-primary rounded-full animate-spin mr-2';
  alert.appendChild(spinner);
  
  // Add message
  const messageEl = document.createElement('span');
  messageEl.textContent = message;
  alert.appendChild(messageEl);
  
  return alert;
}

/**
 * Create an error alert with retry button
 * 
 * @param {Object} options - Error alert configuration
 * @param {string} options.title - Error title
 * @param {string} options.message - Error message
 * @param {Function} options.onRetry - Retry callback
 * @param {string} options.retryLabel - Retry button label
 * @param {string} options.className - Additional CSS classes
 * @returns {HTMLDivElement} Error alert element
 */
export function createErrorAlert(options = {}) {
  const {
    title = 'Error',
    message,
    onRetry,
    retryLabel = 'Retry',
    className
  } = options;

  const alert = createAlert({
    title,
    message,
    variant: 'error',
    className
  });
  
  // Add retry button if callback provided
  if (onRetry) {
    const retryBtn = document.createElement('button');
    retryBtn.type = 'button';
    retryBtn.className = 'mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors';
    retryBtn.textContent = retryLabel;
    retryBtn.addEventListener('click', onRetry);
    
    // Find the content div and append button
    const content = alert.querySelector('div:nth-child(2)');
    if (content) {
      content.appendChild(retryBtn);
    }
  }
  
  return alert;
}

/**
 * Show a toast notification (auto-dismissing alert)
 * 
 * @param {Object} options - Toast configuration
 * @param {string} options.message - Toast message
 * @param {string} options.variant - Toast variant
 * @param {number} options.duration - Duration in ms before auto-dismiss (default: 3000)
 * @param {string} options.position - Position ('top-right', 'top-left', 'bottom-right', 'bottom-left')
 * @returns {HTMLDivElement} Toast element
 */
export function createToast(options = {}) {
  const {
    message,
    variant = 'default',
    duration = 3000,
    position = 'top-right'
  } = options;

  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  const toast = createAlert({
    message,
    variant,
    dismissible: true,
    className: cn(
      'fixed z-50 min-w-[300px] shadow-lg animate-slide-in',
      positions[position] || positions['top-right']
    )
  });
  
  // Auto-dismiss after duration
  setTimeout(() => {
    toast.classList.add('animate-slide-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
  
  // Append to body
  document.body.appendChild(toast);
  
  return toast;
}
