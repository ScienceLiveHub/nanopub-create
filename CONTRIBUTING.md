
# Guide: Adding New Nanopub Template Customizations

## Quick Start

To add customization for a new template, you need to:

1. Create a template class that extends `BaseTemplate`
2. Register it in the template registry
3. (Optional) Add template-specific styles
4. Test with your template URI

## Step-by-Step Tutorial

### Step 1: Identify Your Template

First, get your template's nanopub ID:

```javascript
// Example template URIs:
const geographicalTemplate = 'https://w3id.org/np/RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao';
const citationTemplate = 'https://w3id.org/np/RA1XuAdO6LOtlPJgWiytJHFuK4BFHjQK5x7d9FVymzFnc';

// Extract the ID (last part):
// RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao
// RA1XuAdO6LOtlPJgWiytJHFuK4BFHjQK5x7d9FVymzFnc
```

### Step 2: Create Your Template File

**File:** `src/templates/your-template-name/yourTemplate.js`

```javascript
import { BaseTemplate } from '../base/baseTemplate.js';

/**
 * Customization for [Your Template Name]
 * Template URI: https://w3id.org/np/[TEMPLATE_ID]
 * 
 * Purpose: [Brief description of what this template is for]
 * 
 * Customizations:
 * - Semantic grouping: [describe groups]
 * - Auto-fill: [describe auto-fill rules]
 * - Special validation: [describe any special validation]
 */
export class YourTemplate extends BaseTemplate {
  
  /**
   * Define semantic groups - how related fields should be grouped
   * 
   * @returns {Array} Array of group definitions
   */
  detectSemanticGroups() {
    const groups = [];
    
    // Example: Group related optional fields together
    // Pattern: Look for specific predicates that indicate related fields
    
    const exampleGroup = this.findStatementsWithPredicate('http://example.org/hasRelated');
    if (exampleGroup.length > 0) {
      groups.push({
        id: 'example-group',
        label: '📋 Example Related Fields',
        statements: exampleGroup.map(s => s.id),
        collapsible: true  // Make it collapsible if optional
      });
    }
    
    return groups;
  }
  
  /**
   * Define auto-fill rules - automatically populate related fields
   * 
   * @returns {Array} Array of auto-fill rules
   */
  getAutofillRules() {
    return [
      {
        trigger: 'placeholder-id',      // When this placeholder is filled
        target: 'related-placeholder',   // Auto-fill this placeholder
        transform: (value) => {          // Using this transformation
          return value + '-suffix';
        }
      }
      // Add more rules as needed
    ];
  }
  
  /**
   * Customize field appearance or behavior
   * 
   * @param {HTMLElement} field - The field element
   * @param {Object} placeholder - The placeholder metadata
   * @returns {HTMLElement} Modified field
   */
  customizeField(field, placeholder) {
    // Example: Add specific placeholders or hints
    if (placeholder.id === 'special-field') {
      field.placeholder = 'Custom placeholder text';
      
      // Add a helpful hint
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.textContent = '💡 Tip: This field should contain...';
      field.parentElement?.appendChild(hint);
    }
    
    return field;
  }
  
  /**
   * Helper: Find statements with a specific predicate URI
   */
  findStatementsWithPredicate(predicateUri) {
    return this.template.statements.filter(s => 
      s.predicateUri === predicateUri
    );
  }
  
  /**
   * Helper: Find statements with a specific subject
   */
  findStatementsWithSubject(subjectId) {
    return this.template.statements.filter(s => 
      s.subject === subjectId
    );
  }
  
  /**
   * Helper: Find optional statements
   */
  findOptionalStatements() {
    return this.template.statements.filter(s => s.optional);
  }
}
```

### Step 3: Register Your Template

**File:** `src/templates/registry.js`

```javascript
import { BaseTemplate } from './base/baseTemplate.js';
import { GeographicalTemplate } from './geographical/geographicalTemplate.js';
import { YourTemplate } from './your-template-name/yourTemplate.js';  // Add this

export class TemplateRegistry {
  static templates = {
    // Geographical template
    'RAsPVd3bNOPg5vxQGc1Tqn69v3dSY-ASrAhEFioutCXao': GeographicalTemplate,
    
    // Your new template - add the ID here
    'YOUR_TEMPLATE_ID_HERE': YourTemplate,
    
    // Future templates...
  };
  
  static getCustomization(templateUri) {
    const templateId = templateUri.split('/').pop();
    const CustomClass = this.templates[templateId] || BaseTemplate;
    return CustomClass;
  }
}
```

### Step 4: (Optional) Add Template-Specific Styles

**File:** `src/styles/templates/your-template.css`

```css
/* Styles specific to your template */

.template-your-template-id .special-group {
  border-left: 3px solid #0066cc;
  background: #e7f3ff;
}

.template-your-template-id .important-field {
  border: 2px solid #be2e78;
  background: #fff5f8;
}
```

Then import it in your main CSS or HTML:

```html
<link rel="stylesheet" href="src/styles/templates/your-template.css">
```

## Real-World Examples

### Example 1: Citation Template

**Use case:** Template for citing papers with DOI, title, authors

```javascript
// src/templates/citation/citationTemplate.js
import { BaseTemplate } from '../base/baseTemplate.js';

export class CitationTemplate extends BaseTemplate {
  detectSemanticGroups() {
    return [
      {
        id: 'paper-metadata',
        label: '📄 Paper Metadata',
        statements: this.findPaperMetadataStatements(),
        collapsible: false  // Keep visible - it's important
      },
      {
        id: 'additional-info',
        label: '📝 Additional Information',
        statements: this.findOptionalStatements(),
        collapsible: true   // Can be collapsed
      }
    ];
  }
  
  getAutofillRules() {
    return [
      {
        trigger: 'doi',
        target: 'paper-uri',
        transform: (value) => `https://doi.org/${value}`
      }
    ];
  }
  
  customizeField(field, placeholder) {
    // Add DOI validation hint
    if (placeholder.id === 'doi') {
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.innerHTML = '💡 Format: <code>10.1234/example.2024</code>';
      field.parentElement?.appendChild(hint);
    }
    
    return field;
  }
  
  findPaperMetadataStatements() {
    return this.template.statements.filter(s => 
      ['title', 'doi', 'author', 'year'].some(field => 
        s.object?.includes(field) || s.predicate?.includes(field)
      )
    );
  }
}
```

### Example 2: Experiment Protocol Template

**Use case:** Template for documenting scientific experiments

```javascript
// src/templates/protocol/protocolTemplate.js
import { BaseTemplate } from '../base/baseTemplate.js';

export class ProtocolTemplate extends BaseTemplate {
  detectSemanticGroups() {
    return [
      {
        id: 'materials',
        label: '🧪 Materials & Equipment',
        statements: this.findMaterialStatements(),
        collapsible: false
      },
      {
        id: 'procedure',
        label: '📋 Experimental Procedure',
        statements: this.findProcedureStatements(),
        collapsible: false
      },
      {
        id: 'safety',
        label: '⚠️ Safety Information',
        statements: this.findSafetyStatements(),
        collapsible: true
      }
    ];
  }
  
  getAutofillRules() {
    return [
      {
        trigger: 'experiment-id',
        target: 'protocol-uri',
        transform: (value) => `protocol-${value}`
      },
      {
        trigger: 'experiment-id',
        target: 'results-uri',
        transform: (value) => `results-${value}`
      }
    ];
  }
  
  customizeField(field, placeholder) {
    // Add safety warnings for chemical fields
    if (placeholder.id?.includes('chemical')) {
      field.style.borderLeft = '3px solid #dc2626';
      
      const warning = document.createElement('div');
      warning.className = 'field-hint';
      warning.style.color = '#dc2626';
      warning.textContent = '⚠️ Safety: Consult MSDS before use';
      field.parentElement?.appendChild(warning);
    }
    
    return field;
  }
  
  findMaterialStatements() {
    return this.template.statements.filter(s => 
      s.predicateUri?.includes('hasMaterial') || 
      s.predicateUri?.includes('usesEquipment')
    );
  }
  
  findProcedureStatements() {
    return this.template.statements.filter(s => 
      s.predicateUri?.includes('hasStep') || 
      s.predicateUri?.includes('followsProcedure')
    );
  }
  
  findSafetyStatements() {
    return this.template.statements.filter(s => 
      s.predicateUri?.includes('hasSafetyNote') || 
      s.object?.includes('safety')
    );
  }
}
```

### Example 3: Data Quality Assessment Template

**Use case:** Template for documenting data quality metrics

```javascript
// src/templates/quality/qualityTemplate.js
import { BaseTemplate } from '../base/baseTemplate.js';

export class QualityTemplate extends BaseTemplate {
  detectSemanticGroups() {
    return [
      {
        id: 'dataset-info',
        label: '📊 Dataset Information',
        statements: this.findDatasetStatements(),
        collapsible: false
      },
      {
        id: 'quality-metrics',
        label: '✅ Quality Metrics',
        statements: this.findQualityMetricStatements(),
        collapsible: false
      },
      {
        id: 'validation',
        label: '🔍 Validation Methods',
        statements: this.findValidationStatements(),
        collapsible: true
      }
    ];
  }
  
  getAutofillRules() {
    return [
      {
        trigger: 'dataset-id',
        target: 'quality-report-id',
        transform: (value) => `${value}-quality-report`
      }
    ];
  }
  
  customizeField(field, placeholder) {
    // Add numeric validation for percentage fields
    if (placeholder.label?.toLowerCase().includes('percentage')) {
      field.type = 'number';
      field.min = '0';
      field.max = '100';
      field.step = '0.1';
      field.placeholder = 'Enter percentage (0-100)';
    }
    
    // Add range validation for scores
    if (placeholder.id?.includes('score')) {
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.textContent = '💡 Score range: 0 (poor) to 5 (excellent)';
      field.parentElement?.appendChild(hint);
    }
    
    return field;
  }
  
  findDatasetStatements() {
    return this.template.statements.filter(s => 
      s.subject?.includes('dataset') || 
      s.predicateUri?.includes('describesDataset')
    );
  }
  
  findQualityMetricStatements() {
    return this.template.statements.filter(s => 
      s.predicateUri?.includes('hasQualityMetric') ||
      ['completeness', 'accuracy', 'consistency'].some(metric => 
        s.object?.includes(metric)
      )
    );
  }
  
  findValidationStatements() {
    return this.template.statements.filter(s => 
      s.predicateUri?.includes('validatedBy') || 
      s.predicateUri?.includes('validationMethod')
    );
  }
}
```

## Advanced Features

### 1. Conditional Groups

Show/hide groups based on other field values:

```javascript
detectSemanticGroups() {
  const groups = [];
  
  // Only show advanced options if user selects "Advanced Mode"
  const advancedStatements = this.findAdvancedStatements();
  if (advancedStatements.length > 0) {
    groups.push({
      id: 'advanced-options',
      label: '⚙️ Advanced Options',
      statements: advancedStatements.map(s => s.id),
      collapsible: true,
      condition: {
        field: 'mode',
        value: 'advanced'
      }
    });
  }
  
  return groups;
}
```

### 2. Multi-field Auto-fill

Fill multiple fields based on one trigger:

```javascript
getAutofillRules() {
  return [
    {
      trigger: 'author-orcid',
      targets: [
        {
          placeholder: 'author-name',
          transform: async (orcid) => {
            // Fetch author name from ORCID API
            const response = await fetch(`https://pub.orcid.org/v3.0/${orcid}/person`);
            const data = await response.json();
            return data.name?.['given-names']?.value + ' ' + 
                   data.name?.['family-name']?.value;
          }
        },
        {
          placeholder: 'author-uri',
          transform: (orcid) => `https://orcid.org/${orcid}`
        }
      ]
    }
  ];
}
```

### 3. Field Dependencies

Make fields required based on other fields:

```javascript
customizeField(field, placeholder) {
  // If "has-geometry" is checked, make WKT required
  if (placeholder.id === 'wkt') {
    const hasGeometryField = document.querySelector('[name*="has-geometry"]');
    
    if (hasGeometryField) {
      hasGeometryField.addEventListener('change', (e) => {
        if (e.target.checked) {
          field.required = true;
          field.closest('.form-field')?.classList.add('required');
        } else {
          field.required = false;
          field.closest('.form-field')?.classList.remove('required');
        }
      });
    }
  }
  
  return field;
}
```

### 4. Custom Validation

Add template-specific validation:

```javascript
validateForm(formData) {
  const errors = [];
  
  // Custom validation: DOI format
  if (formData.doi && !formData.doi.startsWith('10.')) {
    errors.push({
      field: 'doi',
      message: 'DOI must start with "10."'
    });
  }
  
  // Custom validation: Date range
  if (formData.startDate && formData.endDate) {
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      errors.push({
        field: 'endDate',
        message: 'End date must be after start date'
      });
    }
  }
  
  return errors;
}
```

## Testing Your Template

### 1. Unit Test

```javascript
// tests/templates/yourTemplate.test.js
import { YourTemplate } from '../../src/templates/your-template/yourTemplate.js';

describe('YourTemplate', () => {
  let template;
  
  beforeEach(() => {
    const mockTemplate = {
      uri: 'https://w3id.org/np/YOUR_TEMPLATE_ID',
      statements: [
        { id: 'st01', predicateUri: 'http://example.org/hasPart' },
        { id: 'st02', predicateUri: 'http://example.org/hasPart' },
        { id: 'st03', optional: true }
      ]
    };
    template = new YourTemplate(mockTemplate);
  });
  
  test('detects semantic groups correctly', () => {
    const groups = template.detectSemanticGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('example-group');
  });
  
  test('provides auto-fill rules', () => {
    const rules = template.getAutofillRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].transform('test')).toBe('test-suffix');
  });
});
```

### 2. Integration Test

```javascript
// tests/integration/yourTemplate.integration.test.js
import { FormGenerator } from '../../src/core/formGenerator.js';
import { TemplateParser } from '../../src/core/templateParser.js';

describe('YourTemplate Integration', () => {
  test('renders form with custom groups', async () => {
    const template = await TemplateParser.fetchAndParse(
      'https://w3id.org/np/YOUR_TEMPLATE_ID'
    );
    
    const container = document.createElement('div');
    const generator = new FormGenerator(template);
    generator.render(container);
    
    // Check that semantic groups are rendered
    const groups = container.querySelectorAll('.semantic-group');
    expect(groups.length).toBeGreaterThan(0);
    
    // Check that auto-fill works
    const triggerField = container.querySelector('[name*="trigger"]');
    const targetField = container.querySelector('[name*="target"]');
    
    triggerField.value = 'test-value';
    triggerField.dispatchEvent(new Event('input'));
    
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(targetField.value).toBe('test-value-suffix');
  });
});
```

## Common Patterns

### Pattern 1: Group by Subject

```javascript
detectSemanticGroups() {
  const groupsBySubject = {};
  
  this.template.statements.forEach(stmt => {
    if (!groupsBySubject[stmt.subject]) {
      groupsBySubject[stmt.subject] = [];
    }
    groupsBySubject[stmt.subject].push(stmt.id);
  });
  
  return Object.entries(groupsBySubject).map(([subject, statements]) => ({
    id: `${subject}-group`,
    label: this.getSubjectLabel(subject),
    statements,
    collapsible: statements.length > 3
  }));
}
```

### Pattern 2: Group Optional Fields Together

```javascript
detectSemanticGroups() {
  const optionalStatements = this.template.statements
    .filter(s => s.optional)
    .map(s => s.id);
  
  if (optionalStatements.length > 0) {
    return [{
      id: 'optional-fields',
      label: '📋 Optional Fields',
      statements: optionalStatements,
      collapsible: true
    }];
  }
  
  return [];
}
```

### Pattern 3: Group by Predicate Type

```javascript
detectSemanticGroups() {
  return [
    {
      id: 'identification',
      label: '🔖 Identification',
      statements: this.findStatementsWithPredicates([
        'http://www.w3.org/2000/01/rdf-schema#label',
        'http://purl.org/dc/terms/identifier'
      ])
    },
    {
      id: 'description',
      label: '📝 Description',
      statements: this.findStatementsWithPredicates([
        'http://purl.org/dc/terms/description',
        'http://www.w3.org/2000/01/rdf-schema#comment'
      ])
    }
  ];
}

findStatementsWithPredicates(predicates) {
  return this.template.statements
    .filter(s => predicates.includes(s.predicateUri))
    .map(s => s.id);
}
```

## Documentation Template

When you create a new template, add documentation:

```javascript
/**
 * [Template Name] Customization
 * 
 * @template-uri https://w3id.org/np/[TEMPLATE_ID]
 * @description [What this template is used for]
 * @example-use-case [Real world example]
 * 
 * Semantic Groups:
 * - [Group 1]: [Description]
 * - [Group 2]: [Description]
 * 
 * Auto-fill Rules:
 * - [Rule 1]: When [trigger] is filled, auto-fill [target] with [transformation]
 * - [Rule 2]: ...
 * 
 * Special Features:
 * - [Feature 1]: [Description]
 * - [Feature 2]: [Description]
 * 
 * @author [Your Name]
 * @date [Date Created]
 * @version 1.0.0
 */
export class YourTemplate extends BaseTemplate {
  // ... implementation
}
```

## Checklist for New Templates

- [ ] Created template class file
- [ ] Registered in template registry
- [ ] Defined semantic groups (if applicable)
- [ ] Defined auto-fill rules (if applicable)
- [ ] Added field customizations (if applicable)
- [ ] Created template-specific CSS (if needed)
- [ ] Written unit tests
- [ ] Written integration tests
- [ ] Added documentation
- [ ] Tested with actual template URI
- [ ] Created example/demo

## Need Help?

Common issues:

1. **Template not recognized**: Check template ID in registry matches URI
2. **Groups not showing**: Check `detectSemanticGroups()` returns valid statement IDs
3. **Auto-fill not working**: Verify placeholder IDs match exactly
4. **Styling not applied**: Check CSS selector specificity

Happy templating! 🎉
