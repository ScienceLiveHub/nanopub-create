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
 */
export class GeographicalTemplate extends BaseTemplate {
  
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
        label: '📍 Geometry details (WKT format)',
        statements: [geometryLinkStmt.id, wktStmt.id],
        collapsible: true
      });
    }
    
    return groups;
  }
  
  getAutofillRules() {
    // Find the geometry placeholder
    const geometryLinkStmt = this.template.statements.find(s => 
      s.predicateUri && s.predicateUri.includes('hasGeometry')
    );
    
    if (!geometryLinkStmt) return [];
    
    const geometryPlaceholderId = geometryLinkStmt.object;
    
    return [
      {
        trigger: 'location',
        target: geometryPlaceholderId,
        transform: (value) => value + '-geometry'
      }
    ];
  }
  
  customizeField(field, placeholder) {
    // Add helpful hints for WKT field
    if (placeholder.id === 'wkt') {
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.innerHTML = '💡 Examples: <code>POINT(2.3 48.9)</code> or <code>POLYGON((7.5 44.3, 8.5 44.3, 8.5 44.9, 7.5 44.9, 7.5 44.3))</code>';
      field.parentElement?.appendChild(hint);
    }
    
    // Add DOI hint
    if (placeholder.id === 'paper') {
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.innerHTML = '💡 Format: <code>10.1234/example.2024</code>';
      field.parentElement?.appendChild(hint);
    }
    
    return field;
  }
}
