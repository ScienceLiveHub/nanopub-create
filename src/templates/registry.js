import { BaseTemplate } from './base/baseTemplate.js';
import { GeographicalTemplate } from './geographical/geographicalTemplate.js';

/**
 * Registry of template customizations
 * Maps template URIs to their customization classes
 */
export class TemplateRegistry {
  static templates = {
    // Geographical coverage template
    'RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao': GeographicalTemplate,
    
    // Add more templates here as they're created
    // 'TEMPLATE_ID': TemplateClass,
  };
  
  /**
   * Get the customization class for a template
   * @param {string} templateUri - Full template URI
   * @returns {Class} Template customization class (or BaseTemplate if not found)
   */
  static getCustomization(templateUri) {
    // Extract template ID from URI
    const templateId = templateUri.split('/').pop();
    
    // Get customization class or default to BaseTemplate
    const CustomClass = this.templates[templateId] || BaseTemplate;
    
    console.log(`[TemplateRegistry] Using ${CustomClass.name} for template ${templateId}`);
    
    return CustomClass;
  }
  
  /**
   * Register a new template customization
   * @param {string} templateId - Template ID (last part of URI)
   * @param {Class} customizationClass - Customization class
   */
  static register(templateId, customizationClass) {
    this.templates[templateId] = customizationClass;
    console.log(`[TemplateRegistry] Registered ${customizationClass.name} for ${templateId}`);
  }
}
