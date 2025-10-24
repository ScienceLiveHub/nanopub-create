/**
 * Template Parser for Nanopublication Templates
 * 
 * Parses TriG-formatted nanopub templates and extracts:
 * - Template metadata (label, description, tags)
 * - Placeholders (form fields)
 * - Statement patterns (RDF structure)
 * - Validation rules
 */

export class TemplateParser {
  constructor(content) {
    this.content = content;
    this.prefixes = {};
    this.template = {
      uri: null,
      label: null,
      description: null,
      labelPattern: null,
      tags: [],
      placeholders: [],
      statements: [],
      repeatablePlaceholderIds: [] // Store IDs of placeholders used in repeatable statements
    };
  }

  /**
   * Main parse method
   */
  parse() {
    this.parsePrefixes();
    this.parseTemplateMetadata();
    this.parsePlaceholders();
    this.parseStatements();
    this.identifyRepeatablePlaceholders(); // Compute after parsing statements
    return this.template;
  }

  /**
   * Parse @prefix declarations
   */
  parsePrefixes() {
    const prefixRegex = /@prefix\s+(\w+):\s+<([^>]+)>/g;
    let match;

    while ((match = prefixRegex.exec(this.content)) !== null) {
      const [, prefix, uri] = match;
      this.prefixes[prefix] = uri;
    }
  }

  /**
   * Parse template-level metadata
   */
  parseTemplateMetadata() {
    // Template URI (usually 'this:')
    const uriMatch = this.content.match(/@prefix\s+this:\s+<([^>]+)>/);
    if (uriMatch) {
      this.template.uri = uriMatch[1];
    }

    // Label
    const labelMatch = this.content.match(/rdfs:label\s+"([^"]+)"\s*[;.]\s*$/m);
    if (labelMatch) {
      this.template.label = labelMatch[1];
    }

    // Description
    const descMatch = this.content.match(/dct:description\s+"([^"]+)"/);
    if (descMatch) {
      this.template.description = descMatch[1];
    }

    // Label pattern
    const patternMatch = this.content.match(/nt:hasNanopubLabelPattern\s+"([^"]+)"/);
    if (patternMatch) {
      this.template.labelPattern = patternMatch[1];
    }

    // Tags
    const tagRegex = /nt:hasTag\s+"([^"]+)"/g;
    let tagMatch;
    while ((tagMatch = tagRegex.exec(this.content)) !== null) {
      this.template.tags.push(tagMatch[1]);
    }
  }

  /**
   * Parse all placeholders (form fields)
   */
  parsePlaceholders() {
    const placeholderTypes = [
      'LiteralPlaceholder',
      'LongLiteralPlaceholder',
      'ExternalUriPlaceholder',
      'TrustyUriPlaceholder',
      'RestrictedChoicePlaceholder',
      'ValuePlaceholder',
      'LocalResourcePlaceholder'
    ];

    placeholderTypes.forEach(type => {
      const regex = new RegExp(
        `(sub:\\w+)\\s+a\\s+nt:${type}[\\s\\S]*?(?=sub:\\w+\\s+a\\s+nt:|sub:\\w+\\s+rdf:|$)`,
        'g'
      );
      let match;

      while ((match = regex.exec(this.content)) !== null) {
        const placeholderBlock = match[0];
        const id = match[1].replace('sub:', '');
        
        const placeholder = this.parsePlaceholder(id, type, placeholderBlock);
        this.template.placeholders.push(placeholder);
      }
    });
  }

  /**
   * Parse individual placeholder
   */
  parsePlaceholder(id, type, block) {
    const placeholder = {
      id,
      type,
      label: null,
      description: null,
      required: true,
      validation: {}
    };

    // Label
    const labelMatch = block.match(/rdfs:label\s+"([^"]+)"/);
    if (labelMatch) {
      placeholder.label = labelMatch[1];
    }

    // Description
    const descMatch = block.match(/dct:description\s+"([^"]+)"/);
    if (descMatch) {
      placeholder.description = descMatch[1];
    }

    // Regex pattern validation
    const regexMatch = block.match(/nt:hasRegex\s+"([^"]+)"/);
    if (regexMatch) {
      placeholder.validation.regex = regexMatch[1];
    }

    // Prefix for URIs
    const prefixMatch = block.match(/nt:hasPrefix\s+"([^"]+)"/);
    if (prefixMatch) {
      placeholder.validation.prefix = prefixMatch[1];
    }

    // RestrictedChoicePlaceholder: fetch options from URI
    if (type === 'RestrictedChoicePlaceholder') {
      const optionsMatch = block.match(/nt:possibleValuesFrom\s+<([^>]+)>/);
      if (optionsMatch) {
        placeholder.options = {
          type: 'uri',
          source: optionsMatch[1]
        };
      } else {
        // Inline values (less common)
        const valuesRegex = /nt:possibleValue\s+<([^>]+)>/g;
        const values = [];
        let valueMatch;
        while ((valueMatch = valuesRegex.exec(block)) !== null) {
          values.push(valueMatch[1]);
        }
        if (values.length > 0) {
          placeholder.options = {
            type: 'inline',
            values
          };
        }
      }
    }

    // Optional statement check
    const optionalMatch = block.match(/nt:isOptional\s+true/);
    if (optionalMatch) {
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
        repeatable: this.isRepeatableStatement(id),
        optional: this.isOptionalStatement(id),
        grouped: this.isGroupedStatement(id)
      };

      // CRITICAL FIX: Check if predicate is a placeholder
      const predicateId = statement.predicate.replace('sub:', '');
      const predicatePlaceholder = this.template.placeholders.find(p => p.id === predicateId);
      
      if (predicatePlaceholder) {
        statement.predicateIsPlaceholder = true;
        statement.predicatePlaceholder = predicatePlaceholder;
      }

      // Check if subject is a placeholder
      const subjectId = statement.subject.replace('sub:', '');
      const subjectPlaceholder = this.template.placeholders.find(p => p.id === subjectId);
      
      if (subjectPlaceholder) {
        statement.subjectIsPlaceholder = true;
        statement.subjectPlaceholder = subjectPlaceholder;
      }

      // Check if object is a placeholder
      const objectId = statement.object.replace('sub:', '');
      const objectPlaceholder = this.template.placeholders.find(p => p.id === objectId);
      
      if (objectPlaceholder) {
        statement.objectIsPlaceholder = true;
        statement.objectPlaceholder = objectPlaceholder;
      }

      statements.push(statement);
    }

    this.template.statements = statements;
  }

  /**
   * Identify placeholders used in repeatable statements
   * This must be called after parseStatements()
   */
  identifyRepeatablePlaceholders() {
    const repeatablePlaceholderIds = new Set();
    
    this.template.statements
      .filter(s => s.repeatable)
      .forEach(statement => {
        if (statement.subjectIsPlaceholder) {
          repeatablePlaceholderIds.add(statement.subjectPlaceholder.id);
        }
        if (statement.predicateIsPlaceholder) {
          repeatablePlaceholderIds.add(statement.predicatePlaceholder.id);
        }
        if (statement.objectIsPlaceholder) {
          repeatablePlaceholderIds.add(statement.objectPlaceholder.id);
        }
      });
    
    this.template.repeatablePlaceholderIds = Array.from(repeatablePlaceholderIds);
  }

  /**
   * Check if a statement is marked as repeatable
   */
  isRepeatableStatement(statementId) {
    const regex = new RegExp(`${statementId}\\s+a\\s+nt:RepeatableStatement`);
    return regex.test(this.content);
  }

  /**
   * Check if a statement is marked as optional
   */
  isOptionalStatement(statementId) {
    const regex = new RegExp(`${statementId}\\s+a\\s+nt:OptionalStatement`);
    return regex.test(this.content);
  }

  /**
   * Check if a statement is marked as grouped
   */
  isGroupedStatement(statementId) {
    const regex = new RegExp(`${statementId}\\s+a\\s+nt:GroupedStatement`);
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
    label = label.replace(/([A-Z])/g, ' $1')
                 .replace(/_/g, ' ')
                 .trim()
                 .toLowerCase();
    
    // Capitalize first letter
    label = label.charAt(0).toUpperCase() + label.slice(1);
    
    return label;
  }

  /**
   * Find placeholder by ID
   */
  findPlaceholder(id) {
    return this.template.placeholders.find(p => p.id === id);
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

// Default export
export default TemplateParser;
