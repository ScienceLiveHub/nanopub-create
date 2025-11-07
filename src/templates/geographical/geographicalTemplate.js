import { BaseTemplate } from '../base/baseTemplate.js';

/**
 * Customization for Geographical Coverage Template
 * Template URI: https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao
 * 
 * Purpose: Document geographical coverage of research papers
 * 
 * Customizations:
 * - Groups geometry + WKT fields together (collapsible)
 * - Auto-fills geometry identifier from location identifier
 * - Groups paper citation fields
 * - Injects template-specific CSS
 * - Provides Tailwind class customizations
 */
export class GeographicalTemplate extends BaseTemplate {
  
  constructor(template) {
    super(template);
    
    // Define template-specific Tailwind customization
    this.tailwindCustomization = {
      // Custom CSS to inject (references geographical.template.css styles)
      customCSS: this.getCustomCSS(),
      
      // Template-specific class for the form container
      containerClass: 'template-geographical',
      
      // Field-specific Tailwind classes
      fieldClasses: {
        'wkt': 'wkt-field field-textarea',
        'location': 'location-field field-input',
        'paper': 'doi-field field-input',
        'quote': 'field-textarea'
      },
      
      // Group-specific Tailwind classes
      groupClasses: {
        'geometry-group': 'geometry-group',
        'paper-citation': 'paper-citation'
      },
      
      // Theme colors
      theme: {
        primary: '#059669',
        accent: '#fbbf24',
        background: '#f0fdf4'
      }
    };
  }
  
  /**
   * Get the custom CSS for this template
   * This CSS will be injected into the form container
   */
  getCustomCSS() {
    return `
      /* Geographical Template Styles - Inline Version */
      .template-geographical {
        --geo-primary: #059669;
        --geo-primary-light: #10b981;
        --geo-primary-lighter: #d1fae5;
        --geo-primary-lightest: #f0fdf4;
        --geo-accent: #fbbf24;
        --geo-accent-light: #fef3c7;
      }
      
      .template-geographical .geometry-group {
        background-color: var(--geo-primary-lightest);
        border-left: 4px solid var(--geo-primary);
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin: 1.5rem 0;
        box-shadow: 0 1px 3px rgba(5, 150, 105, 0.1);
      }
      
      .template-geographical .wkt-field {
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 0.9em;
        background-color: #f8f9fa;
      }
      
      .template-geographical .paper-citation {
        background: var(--geo-accent-light);
        border-left: 3px solid var(--geo-accent);
        border-radius: 0.5rem;
        padding: 1.25rem;
        margin: 1rem 0;
      }
      
      .template-geographical .doi-field {
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 0.9em;
      }
      
      .template-geographical .field-hint {
        margin-top: 0.5rem;
        padding: 0.625rem 0.875rem;
        background-color: var(--geo-primary-lightest);
        border-left: 3px solid var(--geo-primary-light);
        border-radius: 0.375rem;
        font-size: 0.85rem;
        color: rgb(5, 78, 59);
      }
      
      .template-geographical .field-hint code {
        background-color: white;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        font-size: 0.85em;
        color: var(--geo-primary);
        border: 1px solid var(--geo-primary-lighter);
      }
    `;
  }
  
  /**
   * Detect semantic groups specific to geographical template
   */
  detectSemanticGroups() {
    const groups = [];
    
    // Group 1: Geometry + WKT (optional fields together)
    const geometryLinkStmt = this.template.statements.find(s => 
      s.predicateUri && s.predicateUri.includes('hasGeometry') && s.optional
    );
    const wktStmt = this.template.statements.find(s => 
      s.predicateUri && s.predicateUri.includes('asWKT') && s.optional
    );
    
    if (geometryLinkStmt && wktStmt) {
      groups.push({
        id: 'geometry-group',
        label: '📍 Geometry Details (WKT Format)',
        statements: [geometryLinkStmt.id, wktStmt.id],
        collapsible: true,
        cssClass: 'geometry-group' // Apply custom CSS class
      });
    }
    
    // Group 2: Paper citation fields (if they exist)
    const paperStmt = this.template.statements.find(s => 
      s.predicateUri && (s.predicateUri.includes('cites') || s.predicateUri.includes('paper'))
    );
    const quoteStmt = this.template.statements.find(s => 
      s.predicateUri && s.predicateUri.includes('quote')
    );
    
    if (paperStmt && quoteStmt) {
      groups.push({
        id: 'paper-citation',
        label: '📄 Paper Citation & Evidence',
        statements: [paperStmt.id, quoteStmt.id],
        collapsible: false,
        cssClass: 'paper-citation'
      });
    }
    
    return groups;
  }
  
  /**
   * Auto-fill rules for geographical template
   */
  getAutofillRules() {
    const rules = [];
    
    // Find the geometry placeholder
    const geometryLinkStmt = this.template.statements.find(s => 
      s.predicateUri && s.predicateUri.includes('hasGeometry')
    );
    
    if (geometryLinkStmt) {
      const geometryPlaceholderId = geometryLinkStmt.object;
      
      // Rule: Auto-fill geometry ID from location
      rules.push({
        trigger: 'location',
        target: geometryPlaceholderId,
        transform: (value) => {
          // Create a valid URI-friendly geometry identifier
          return value.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') + '-geometry';
        }
      });
    }
    
    return rules;
  }
  
  /**
   * Customize individual fields
   */
  customizeField(field, placeholder) {
    // Add helpful hints for WKT field
    if (placeholder.id === 'wkt' || placeholder.predicateUri?.includes('asWKT')) {
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.innerHTML = `
        💡 <strong>WKT Format Examples:</strong><br>
        Point: <code>POINT(2.3 48.9)</code><br>
        Polygon: <code>POLYGON((7.5 44.3, 8.5 44.3, 8.5 44.9, 7.5 44.9, 7.5 44.3))</code><br>
        <a href="https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry" target="_blank" style="color: inherit; text-decoration: underline;">Learn more about WKT</a>
      `;
      field.parentElement?.appendChild(hint);
    }
    
    // Add DOI format hint
    if (placeholder.id === 'paper' || placeholder.predicateUri?.includes('cites')) {
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.innerHTML = '💡 Enter DOI in format: <code>10.1234/example.2024</code>';
      field.parentElement?.appendChild(hint);
    }
    
    // Add location hint
    if (placeholder.id === 'location' || placeholder.predicateUri?.includes('coverage')) {
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.innerHTML = '💡 Examples: "Amazon Basin", "Northern Europe", "Mediterranean Region"';
      field.parentElement?.appendChild(hint);
    }
    
    // Add quote hint
    if (placeholder.predicateUri?.includes('quote')) {
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.innerHTML = '💡 Copy the exact text from the paper that describes the geographical coverage';
      field.parentElement?.appendChild(hint);
    }
    
    return field;
  }
  
  /**
   * Get form-level customizations
   * This can be used by the form generator to apply template-wide settings
   */
  getFormCustomizations() {
    return {
      title: '🌍 Geographical Coverage',
      description: 'Document the geographical area or region covered by this research',
      submitButtonText: 'Publish Geographical Coverage',
      containerClass: 'template-geographical'
    };
  }
}
