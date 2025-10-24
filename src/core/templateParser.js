/**
 * Template Parser for Nanopublications
 * 
 * Parses nanopub template files in TriG format and extracts:
 * - Template metadata (label, description)
 * - Placeholders (form fields)
 * - Statements (RDF structure)
 * - Validation rules
 * - Label patterns
 */

export class TemplateParser {
  constructor(trigContent) {
    this.content = trigContent;
    this.prefixes = {};
    this.template = null;
  }

  /**
   * Main parsing function
   * @returns {Object} Parsed template structure
   */
  parse() {
    this.extractPrefixes();
    this.parseTemplateMetadata();
    this.parsePlaceholders();
    this.parseStatements();
    
    return this.template;
  }

  /**
   * Extract @prefix declarations from TriG content
   */
  extractPrefixes() {
    const prefixRegex = /@prefix\s+(\w+):\s+<([^>]+)>\s*\./g;
    let match;

    while ((match = prefixRegex.exec(this.content)) !== null) {
      const [, prefix, uri] = match;
      this.prefixes[prefix] = uri;
    }
  }

  /**
   * Parse template metadata (label, description, patterns)
   */
  parseTemplateMetadata() {
    this.template = {
      uri: this.extractTemplateUri(),
      label: this.extractValue('rdfs:label'),
      description: this.extractValue('dct:description'),
      labelPattern: this.extractValue('nt:hasNanopubLabelPattern'),
      tags: this.extractValues('nt:hasTag'),
      prefixes: this.prefixes,
      placeholders: [],
      statements: []
    };
  }

  /**
   * Extract template URI from the content
   */
  extractTemplateUri() {
    const match = this.content.match(/@prefix this: <([^>]+)>/);
    return match ? match[1] : null;
  }

  /**
   * Extract a single value for a predicate
   */
  extractValue(predicate) {
    const regex = new RegExp(`${predicate}\\s+"([^"]+)"`, 'i');
    const match = this.content.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Extract multiple values for a predicate
   */
  extractValues(predicate) {
    const regex = new RegExp(`${predicate}\\s+"([^"]+)"`, 'gi');
    const matches = [];
    let match;

    while ((match = regex.exec(this.content)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  }

  /**
   * Parse all placeholders (form fields) from the template
   */
  parsePlaceholders() {
    const placeholders = [];

    // Find all placeholder declarations
    const placeholderTypes = [
      'nt:LiteralPlaceholder',
      'nt:LongLiteralPlaceholder',
      'nt:ExternalUriPlaceholder',
      'nt:RestrictedChoicePlaceholder',
      'nt:ValuePlaceholder',
      'nt:TrustyUriPlaceholder',
      'nt:LocalResourcePlaceholder'
    ];

    for (const type of placeholderTypes) {
      const regex = new RegExp(
        `(sub:\\w+)\\s+a\\s+${type}\\s*;([^.]+)\\.`,
        'gs'
      );
      let match;

      while ((match = regex.exec(this.content)) !== null) {
        const [, id, properties] = match;
        const placeholder = this.parsePlaceholder(id, type, properties);
        placeholders.push(placeholder);
      }
    }

    this.template.placeholders = placeholders;
  }

  /**
   * Parse individual placeholder with its properties
   */
  parsePlaceholder(id, type, properties) {
    const placeholder = {
      id: id.replace('sub:', ''),
      type: type.replace('nt:', ''),
      label: null,
      description: null,
      required: true,
      validation: {},
      options: null
    };

    // Extract label
    const labelMatch = properties.match(/rdfs:label\s+"([^"]+)"/);
    if (labelMatch) {
      placeholder.label = labelMatch[1];
    }

    // Extract description
    const descMatch = properties.match(/dct:description\s+"([^"]+)"/);
    if (descMatch) {
      placeholder.description = descMatch[1];
    }

    // Extract regex validation
    const regexMatch = properties.match(/nt:hasRegex\s+"([^"]+)"/);
    if (regexMatch) {
      placeholder.validation.regex = regexMatch[1];
    }

    // Extract possible values (for restricted choice)
    const valuesMatch = properties.match(/nt:possibleValuesFrom\s+<([^>]+)>/);
    if (valuesMatch) {
      placeholder.options = {
        type: 'uri',
        source: valuesMatch[1]
      };
    }

    // Extract possible values from inline list
    const inlineValuesMatch = properties.match(/nt:possibleValue\s+([^;]+)/g);
    if (inlineValuesMatch) {
      placeholder.options = {
        type: 'inline',
        values: inlineValuesMatch.map(v => v.replace(/nt:possibleValue\s+/, '').trim())
      };
    }

    // Check if optional
    if (properties.includes('nt:hasDefaultValue')) {
      placeholder.required = false;
    }

    return placeholder;
  }

  /**
   * Parse statement patterns from the template
   */
  parseStatements() {
    const statements = [];

    // Find all statement declarations
    const statementRegex = /(sub:\w+)\s+rdf:subject\s+([^;]+);\s*rdf:predicate\s+([^;]+);\s*rdf:object\s+([^.\s]+)/gs;
    let match;

    while ((match = statementRegex.exec(this.content)) !== null) {
      const [, id, subject, predicate, object] = match;
      
      const statement = {
        id: id.replace('sub:', ''),
        subject: subject.trim(),
        predicate: predicate.trim(),
        object: object.trim(),
        repeatable: this.isRepeatableStatement(id)
      };

      statements.push(statement);
    }

    this.template.statements = statements;
  }

  /**
   * Check if a statement is marked as repeatable
   */
  isRepeatableStatement(statementId) {
    const regex = new RegExp(`${statementId}\\s+a\\s+nt:RepeatableStatement`);
    return regex.test(this.content);
  }

  /**
   * Expand prefixed URIs to full URIs
   */
  expandUri(prefixedUri) {
    const [prefix, localName] = prefixedUri.split(':');
    
    if (this.prefixes[prefix]) {
      return this.prefixes[prefix] + localName;
    }
    
    return prefixedUri;
  }

  /**
   * Get friendly label for a predicate URI
   */
  getPredicateLabel(predicate) {
    // Check if there's a custom label defined
    const labelRegex = new RegExp(`${predicate}\\s+rdfs:label\\s+"([^"]+)"`);
    const match = this.content.match(labelRegex);
    
    if (match) {
      return match[1];
    }

    // Generate label from URI
    const expanded = this.expandUri(predicate);
    const parts = expanded.split(/[#\/]/);
    let label = parts[parts.length - 1];
    
    // Convert camelCase or snake_case to readable format
    label = label
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .trim()
      .toLowerCase();
    
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  /**
   * Clear cached data
   */
  clear() {
    this.prefixes = {};
    this.template = null;
  }
}

/**
 * Utility function to parse template from URI
 */
export async function parseTemplateFromUri(templateUri) {
  const response = await fetch(templateUri);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch template: ${response.statusText}`);
  }

  const content = await response.text();
  const parser = new TemplateParser(content);
  
  return parser.parse();
}

/**
 * Utility function to validate template structure
 */
export function validateTemplate(template) {
  const errors = [];

  if (!template.uri) {
    errors.push('Template URI is missing');
  }

  if (!template.label) {
    errors.push('Template label is missing');
  }

  if (!template.placeholders || template.placeholders.length === 0) {
    errors.push('Template has no placeholders');
  }

  if (!template.statements || template.statements.length === 0) {
    errors.push('Template has no statements');
  }

  // Validate placeholders
  template.placeholders?.forEach((placeholder, index) => {
    if (!placeholder.id) {
      errors.push(`Placeholder at index ${index} is missing an ID`);
    }
    if (!placeholder.label) {
      errors.push(`Placeholder ${placeholder.id} is missing a label`);
    }
  });

  // Validate statements
  template.statements?.forEach((statement, index) => {
    if (!statement.subject || !statement.predicate || !statement.object) {
      errors.push(`Statement at index ${index} is incomplete`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

// Export for testing
export default TemplateParser;
