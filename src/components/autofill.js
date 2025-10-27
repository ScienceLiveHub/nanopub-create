/**
 * Auto-fill manager for populating related fields
 */

export class AutofillManager {
  constructor() {
    this.rules = [];
  }
  
  /**
   * Add an auto-fill rule
   * @param {string} trigger - Placeholder ID that triggers the auto-fill
   * @param {string} target - Placeholder ID to fill
   * @param {Function} transform - Transformation function
   */
  addRule(trigger, target, transform) {
    this.rules.push({ trigger, target, transform });
  }
  
  /**
   * Setup auto-fill for all registered rules
   */
  setupAll() {
    setTimeout(() => {
      const allFields = document.querySelectorAll('input, textarea, select');
      
      this.rules.forEach(rule => {
        // Find trigger fields
        allFields.forEach(field => {
          const fieldName = field.name || field.id || '';
          
          if (fieldName.includes(rule.trigger)) {
            field.addEventListener('input', async (e) => {
              const value = e.target.value;
              if (!value) return;
              
              // Find target field
              allFields.forEach(async (targetField) => {
                const targetName = targetField.name || targetField.id || '';
                
                if (targetName.includes(rule.target) && !targetField.value) {
                  // Apply transformation (can be async)
                  const transformedValue = await rule.transform(value);
                  
                  // Auto-fill
                  targetField.value = transformedValue;
                  targetField.dispatchEvent(new Event('input', { bubbles: true }));
                  
                  // Visual feedback
                  this.showFeedback(targetField);
                }
              });
            });
          }
        });
      });
    }, 200);
  }
  
  /**
   * Show visual feedback for auto-filled field
   */
  showFeedback(field) {
    field.classList.add('auto-filled');
    
    const hint = document.createElement('div');
    hint.className = 'auto-fill-indicator';
    hint.textContent = '✨ Auto-filled';
    hint.style.cssText = 'font-size: 0.75em; color: #059669; margin-top: 4px;';
    
    const existingHint = field.parentElement.querySelector('.auto-fill-indicator');
    if (existingHint) existingHint.remove();
    
    field.parentElement.appendChild(hint);
    
    setTimeout(() => {
      field.classList.remove('auto-filled');
      hint.remove();
    }, 3000);
  }
}
