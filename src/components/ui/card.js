/**
 * Card Component
 * Vanilla JS card container (similar to assertion-box)
 */

import { cn } from '../../utils/cn.js';

/**
 * Create a card container
 * 
 * @param {Object} options - Card configuration
 * @param {string} options.title - Card title
 * @param {string} options.description - Card description
 * @param {HTMLElement|HTMLElement[]} options.content - Card content elements
 * @param {HTMLElement|HTMLElement[]} options.footer - Card footer elements
 * @param {string} options.variant - Card variant ('default', 'assertion', 'outline')
 * @param {string} options.className - Additional CSS classes
 * @returns {HTMLDivElement} Card element
 * 
 * @example
 * const card = createCard({
 *   title: 'Assertion',
 *   content: [inputElement, textareaElement],
 *   variant: 'assertion'
 * });
 */
export function createCard(options = {}) {
  const {
    title,
    description,
    content,
    footer,
    variant = 'default',
    className
  } = options;

  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4',
    assertion: 'assertion-box', // Uses Tailwind utility from tailwind.base.css
    outline: 'border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4'
  };

  const card = document.createElement('div');
  card.className = cn(
    variants[variant] || variants.default,
    className
  );
  
  // Add header if title or description provided
  if (title || description) {
    const header = document.createElement('div');
    header.className = 'mb-4';
    
    if (title) {
      const titleEl = document.createElement('h3');
      titleEl.className = 'text-lg font-semibold text-gray-900 dark:text-gray-100';
      titleEl.textContent = title;
      header.appendChild(titleEl);
    }
    
    if (description) {
      const descEl = document.createElement('p');
      descEl.className = 'text-sm text-gray-600 dark:text-gray-400 mt-1';
      descEl.textContent = description;
      header.appendChild(descEl);
    }
    
    card.appendChild(header);
  }
  
  // Add content
  if (content) {
    const contentContainer = document.createElement('div');
    contentContainer.className = 'space-y-4';
    
    const contents = Array.isArray(content) ? content : [content];
    contents.forEach(item => {
      if (item) contentContainer.appendChild(item);
    });
    
    card.appendChild(contentContainer);
  }
  
  // Add footer if provided
  if (footer) {
    const footerContainer = document.createElement('div');
    footerContainer.className = 'mt-4 pt-4 border-t border-gray-200 dark:border-gray-700';
    
    const footers = Array.isArray(footer) ? footer : [footer];
    footers.forEach(item => {
      if (item) footerContainer.appendChild(item);
    });
    
    card.appendChild(footerContainer);
  }
  
  return card;
}

/**
 * Create a collapsible card
 * 
 * @param {Object} options - Collapsible card configuration
 * @param {string} options.title - Card title (always visible)
 * @param {HTMLElement|HTMLElement[]} options.content - Collapsible content
 * @param {boolean} options.defaultExpanded - Whether card starts expanded
 * @param {string} options.className - Additional CSS classes
 * @returns {HTMLDivElement} Collapsible card element
 */
export function createCollapsibleCard(options = {}) {
  const {
    title,
    content,
    defaultExpanded = false,
    className
  } = options;

  const card = document.createElement('div');
  card.className = cn(
    'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
    className
  );
  
  let isExpanded = defaultExpanded;
  
  // Create header (always visible, clickable)
  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors';
  
  const titleEl = document.createElement('span');
  titleEl.className = 'font-semibold text-gray-900 dark:text-gray-100';
  titleEl.textContent = title;
  header.appendChild(titleEl);
  
  // Add chevron icon
  const icon = document.createElement('span');
  icon.className = cn(
    'transition-transform duration-200',
    isExpanded && 'rotate-90'
  );
  icon.innerHTML = '▶';
  header.appendChild(icon);
  
  card.appendChild(header);
  
  // Create content container
  const contentContainer = document.createElement('div');
  contentContainer.className = cn(
    'transition-all duration-200 overflow-hidden',
    isExpanded ? 'max-h-full' : 'max-h-0'
  );
  
  const contentInner = document.createElement('div');
  contentInner.className = 'p-4 space-y-4';
  
  const contents = Array.isArray(content) ? content : [content];
  contents.forEach(item => {
    if (item) contentInner.appendChild(item);
  });
  
  contentContainer.appendChild(contentInner);
  card.appendChild(contentContainer);
  
  // Toggle functionality
  header.addEventListener('click', () => {
    isExpanded = !isExpanded;
    
    if (isExpanded) {
      contentContainer.style.maxHeight = contentContainer.scrollHeight + 'px';
      icon.classList.add('rotate-90');
    } else {
      contentContainer.style.maxHeight = '0';
      icon.classList.remove('rotate-90');
    }
  });
  
  // Set initial state
  if (isExpanded) {
    setTimeout(() => {
      contentContainer.style.maxHeight = contentContainer.scrollHeight + 'px';
    }, 0);
  }
  
  return card;
}
