/**
 * Utility for combining class names (inspired by shadcn's cn function)
 * Filters out falsy values and joins class names
 * 
 * @param {...(string|undefined|null|false)} classes - Class names to combine
 * @returns {string} Combined class string
 * 
 * @example
 * cn('base-class', someCondition && 'conditional-class', 'another-class')
 * // Returns: 'base-class conditional-class another-class' (if someCondition is true)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
