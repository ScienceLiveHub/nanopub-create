/**
 * Base template customization class
 * All template customizations extend this
 */

export class BaseTemplate {
  constructor(template) {
    this.template = template;
  }
  
  /**
   * Detect semantic groups of related fields
   * Override in subclasses to define custom groupings
   * 
   * @returns {Array} Array of group definitions
   */
  detectSemanticGroups() {
    return [];
  }
  
  /**
   * Get auto-fill rules for this template
   * Override in subclasses to define custom rules
   * 
   * @returns {Array} Array of auto-fill rules
   */
  getAutofillRules() {
    return [];
  }
  
  /**
   * Customize individual field rendering
   * Override in subclasses for field-specific customization
   * 
   * @param {HTMLElement} field - The field element
   * @param {Object} placeholder - The placeholder metadata
   * @returns {HTMLElement} Modified field
   */
  customizeField(field, placeholder) {
    return field;
  }
  
  /**
   * Validate form data
   * Override in subclasses for template-specific validation
   * 
   * @param {Object} formData - Form data to validate
   * @returns {Array} Array of validation errors
   */
  validateForm(formData) {
    return [];
  }
  
  // Helper methods for subclasses
  
  findStatementsWithPredicate(predicateUri) {
    return this.template.statements.filter(s => 
      s.predicateUri === predicateUri
    );
  }
  
  findStatementsWithSubject(subjectId) {
    return this.template.statements.filter(s => 
      s.subject === subjectId
    );
  }
  
  findOptionalStatements() {
    return this.template.statements.filter(s => s.optional);
  }
  
  findRequiredStatements() {
    return this.template.statements.filter(s => !s.optional);
  }
}
