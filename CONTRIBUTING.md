# Guide: Adding New Nanopub Template Customizations

## Table of Contents

- [Quick Start](#quick-start)
- [Step-by-Step Tutorial](#step-by-step-tutorial)
- [Styling Guidelines](#styling-guidelines)
- [Code Style Guidelines](#code-style-guidelines)
- [Real-World Examples](#real-world-examples)
- [Advanced Patterns](#advanced-patterns)
- [Testing Your Template](#testing-your-template)
- [Pull Request Process](#pull-request-process)
- [Need Help?](#need-help)

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
        label: 'Example Related Fields',
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
      hint.textContent = 'Tip: This field should contain...';
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

Then import it in `src/styles/styles-index.css`:

```css
@import './tailwind.base.css';
@import './templates/geographical.css';
@import './templates/your-template.css';  /* Add this */
```

## Styling Guidelines

### What Goes Where?

Understanding where to put different types of customizations:

| Style Type | Location | Example |
|------------|----------|---------|
| **Global form utilities** | `tailwind.base.css` | `field-input`, `submit-button`, `form-container` |
| **Template colors** | Template CSS | `--geo-primary: #059669` |
| **Template-specific groups** | Template CSS | `.template-geo .geometry-group` |
| **Template-specific fields** | Template CSS | `.template-geo .wkt-field` |
| **Field grouping logic** | Template JS | `detectSemanticGroups()` |
| **Auto-fill logic** | Template JS | `getAutofillRules()` |
| **Field hints/help** | Template JS | `customizeField()` |

### CSS Best Practices

Follow these principles when writing template styles:

#### 1. Always Scope with Template Class

```css
/* Good - Scoped to template */
.template-your-name .special-field {
  background: #f0f8ff;
}

/* Bad - Affects all templates */
.special-field {
  background: #f0f8ff;
}
```

#### 2. Use CSS Variables for Colors

```css
.template-your-name {
  --primary: #0066cc;
  --primary-light: #3399ff;
  --primary-lighter: #cce6ff;
}

.template-your-name .field {
  border-color: var(--primary);
  background: var(--primary-lighter);
}
```

#### 3. Support Dark Mode

```css
.template-your-name .field {
  background: #f0f8ff;
  color: #1a1a1a;
}

.dark .template-your-name .field {
  background: rgba(0, 102, 204, 0.1);
  color: #e5e5e5;
}
```

#### 4. Use Consistent Spacing

- Padding: Use multiples of 0.25rem (4px)
- Margins: Use multiples of 0.5rem (8px)
- Border radius: 0.5rem (8px) or 0.375rem (6px)

```css
.template-your-name .group {
  padding: 1.5rem;        /* 24px */
  margin-bottom: 1rem;    /* 16px */
  border-radius: 0.5rem;  /* 8px */
}
```

#### 5. Add Hover States and Transitions

```css
.template-your-name .group {
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.template-your-name .group:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}
```

## Code Style Guidelines

### JavaScript

- Use ES6+ features (const, let, arrow functions)
- Add JSDoc comments for all public methods
- Use meaningful variable names
- Keep functions small and focused
- Handle errors gracefully

```javascript
/**
 * Find statements with a specific predicate
 * @param {string} predicateUri - The predicate URI to search for
 * @returns {Array} Matching statements
 */
findStatementsWithPredicate(predicateUri) {
  return this.template.statements.filter(s => 
    s.predicateUri === predicateUri
  );
}
```

### CSS

- Use 2-space indentation
- Group related properties
- Add comments for major sections
- Use lowercase with hyphens for class names
- Order properties logically (layout, box model, typography, visual)

```css
/* Good */
.template-name .field {
  /* Layout */
  display: block;
  
  /* Box model */
  padding: 1rem;
  margin-bottom: 0.5rem;
  border: 2px solid #ccc;
  border-radius: 0.5rem;
  
  /* Typography */
  font-size: 0.95rem;
  
  /* Visual */
  background-color: white;
  transition: all 0.2s;
}
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
        label: 'Paper Metadata',
        statements: this.findPaperMetadataStatements(),
        collapsible: false  // Keep visible - it's important
      },
      {
        id: 'additional-info',
        label: 'Additional Information',
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
      hint.innerHTML = 'Format: <code>10.1234/example.2024</code>';
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
        label: 'Materials & Equipment',
        statements: this.findMaterialStatements(),
        collapsible: false
      },
      {
        id: 'procedure',
        label: 'Experimental Procedure',
        statements: this.findProcedureStatements(),
        collapsible: false
      },
      {
        id: 'data-collection',
        label: 'Data Collection',
        statements: this.findDataStatements(),
        collapsible: true
      }
    ];
  }
  
  getAutofillRules() {
    return [
      {
        trigger: 'experiment-name',
        target: 'experiment-id',
        transform: (value) => {
          const timestamp = Date.now();
          return value.toLowerCase().replace(/\s+/g, '-') + `-${timestamp}`;
        }
      }
    ];
  }
  
  customizeField(field, placeholder) {
    if (placeholder.predicateUri?.includes('procedure')) {
      const hint = document.createElement('div');
      hint.className = 'field-hint';
      hint.textContent = 'Describe step-by-step procedure in detail';
      field.parentElement?.appendChild(hint);
    }
    return field;
  }
  
  findMaterialStatements() {
    return this.template.statements.filter(s => 
      s.predicateUri?.includes('material') || 
      s.predicateUri?.includes('equipment')
    );
  }
  
  findProcedureStatements() {
    return this.template.statements.filter(s => 
      s.predicateUri?.includes('procedure') || 
      s.predicateUri?.includes('method')
    );
  }
  
  findDataStatements() {
    return this.template.statements.filter(s => 
      s.predicateUri?.includes('data') || 
      s.predicateUri?.includes('measurement')
    );
  }
}
```

## Advanced Patterns

### Pattern 1: Conditional Groups

```javascript
detectSemanticGroups() {
  const groups = [];
  
  // Only create group if certain statements exist
  const locationStmt = this.template.statements.find(s => 
    s.predicateUri?.includes('location')
  );
  
  if (locationStmt) {
    const relatedStmts = this.findRelatedLocationStatements(locationStmt);
    if (relatedStmts.length > 0) {
      groups.push({
        id: 'location-details',
        label: 'Location Details',
        statements: [locationStmt.id, ...relatedStmts.map(s => s.id)],
        collapsible: true
      });
    }
  }
  
  return groups;
}

findRelatedLocationStatements(locationStmt) {
  // Find statements that reference the same subject
  return this.template.statements.filter(s => 
    s.subject === locationStmt.subject && 
    s.id !== locationStmt.id
  );
}
```

### Pattern 2: Dynamic Auto-fill

```javascript
getAutofillRules() {
  const rules = [];
  
  // Find all date fields and auto-fill with current date
  const dateFields = this.template.statements
    .filter(s => s.predicateUri?.includes('date'))
    .map(s => s.object);
  
  dateFields.forEach(field => {
    rules.push({
      trigger: null,  // No trigger - fill immediately
      target: field,
      transform: () => new Date().toISOString().split('T')[0]
    });
  });
  
  return rules;
}
```

### Pattern 3: Group by Predicate Type

```javascript
detectSemanticGroups() {
  return [
    {
      id: 'identification',
      label: 'Identification',
      statements: this.findStatementsWithPredicates([
        'http://www.w3.org/2000/01/rdf-schema#label',
        'http://purl.org/dc/terms/identifier'
      ])
    },
    {
      id: 'description',
      label: 'Description',
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

## Testing Your Template

Before submitting your template customization, complete this testing checklist:

### 1. Load Template
```javascript
const templateUri = 'https://w3id.org/np/YOUR_TEMPLATE_ID';
await creator.renderFromTemplateUri(templateUri, container);
```

### 2. Verify Customizations
- [ ] Field grouping displays correctly
- [ ] Collapsible groups work (if applicable)
- [ ] Auto-fill rules populate fields correctly
- [ ] Field hints appear in the right places
- [ ] Custom styling is applied

### 3. Test Dark Mode
- [ ] Switch to dark mode
- [ ] Verify all colors are readable
- [ ] Check that custom styles work in dark mode
- [ ] Ensure contrast is sufficient

### 4. Test Responsive Design
- [ ] View on mobile viewport (< 640px)
- [ ] Check on tablet (640px - 1024px)
- [ ] Verify desktop layout (> 1024px)
- [ ] Ensure all fields are accessible

### 5. Verify Nanopub Generation
- [ ] Fill out the form completely
- [ ] Create nanopublication
- [ ] Verify the TriG output is valid
- [ ] Check that all form values appear in output
- [ ] Test signing the nanopub
- [ ] Try publishing to test server

### 6. Edge Cases
- [ ] Test with empty optional fields
- [ ] Test with very long text inputs
- [ ] Test with special characters in fields
- [ ] Test with multiple repeatable fields (if applicable)

## Pull Request Process

### 1. Fork and Clone
```bash
git clone https://github.com/ScienceLiveHub/nanopub-create.git
cd nanopub-create
```

### 2. Create Feature Branch
```bash
git checkout -b template/your-template-name
```

### 3. Make Your Changes
- Add template class in `src/templates/[name]/`
- Add template styles in `src/styles/templates/`
- Register template in `src/templates/registry.js`
- Import styles in `src/styles/styles-index.css`
- Test thoroughly

### 4. Commit Changes
```bash
git add .
git commit -m "Add customization for [Template Name] template

- Semantic grouping for [describe]
- Auto-fill rules for [describe]
- Custom styling with [describe theme]
- Field hints for [describe fields]"
```

### 5. Push and Create PR
```bash
git push origin template/your-template-name
```

### 6. PR Description Should Include:

**Template Information:**
- Template URI: `https://w3id.org/np/...`
- Template Name: [Name]
- Purpose: [What this template is for]

**Customizations:**
- Semantic grouping: [Describe groups]
- Auto-fill rules: [Describe rules]
- Custom styling: [Describe theme/colors]
- Special features: [Any unique features]

**Testing:**
- [ ] Tested with actual template URI
- [ ] Verified in light and dark modes
- [ ] Tested on mobile viewport
- [ ] Verified nanopub generation
- [ ] Tested signing

**Screenshots:**
(Include screenshots showing the customized form)

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
- [ ] Imported CSS in styles-index.css
- [ ] Removed any emojis from code
- [ ] Written documentation
- [ ] Tested with actual template URI
- [ ] Tested in light and dark modes
- [ ] Tested responsive design
- [ ] Verified nanopub generation
- [ ] Created example/demo (optional)

## Need Help?

Common issues and solutions:

### Template not recognized
**Problem:** Template customization not loading
**Solution:** Check that template ID in registry.js matches the last part of the template URI exactly

### Groups not showing
**Problem:** Semantic groups not appearing in form
**Solution:** Verify that `detectSemanticGroups()` returns valid statement IDs that exist in the template

### Auto-fill not working
**Problem:** Fields not auto-populating
**Solution:** 
- Check placeholder IDs match exactly (case-sensitive)
- Verify trigger field ID is correct
- Test transform function returns expected value

### Styling not applied
**Problem:** Custom CSS not showing
**Solution:**
- Verify CSS file is imported in `styles-index.css`
- Check CSS selector specificity and scoping
- Ensure template class is applied to container
- Clear browser cache

### Dark mode issues
**Problem:** Colors unreadable in dark mode
**Solution:**
- Add `.dark` selector for all custom styles
- Use CSS variables for colors
- Test contrast ratios

### Questions or Discussion

- **Issues:** [GitHub Issues](https://github.com/ScienceLiveHub/nanopub-create/issues)
- **Discussions:** [GitHub Discussions](https://github.com/ScienceLiveHub/nanopub-create/discussions)
- **Email:** contact@vitenhub.no

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
