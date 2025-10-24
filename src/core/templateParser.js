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
 * Parse template with label fetching
 */
async parseWithLabels() {
    // 1. Parse template structure
    this.parse();
    
    // 2. Collect all URIs that need labels
    const urisToFetch = new Set();
    
    // Collect from placeholders
    this.template.placeholders.forEach(placeholder => {
        if (placeholder.id && !placeholder.id.startsWith('sub:')) {
            urisToFetch.add(placeholder.id);
        }
    });
    
    // Collect from statements
    this.template.statements.forEach(statement => {
        if (statement.predicate && statement.predicate.startsWith('http')) {
            urisToFetch.add(statement.predicate);
        }
        if (statement.subject && statement.subject.startsWith('http')) {
            urisToFetch.add(statement.subject);
        }
        if (statement.object && statement.object.startsWith('http')) {
            urisToFetch.add(statement.object);
        }
    });
    
    // 3. Fetch labels for all URIs
    if (!this.template.labels) {
        this.template.labels = {};
    }
    
    const labelFetcher = new LabelFetcher();
    const fetchedLabels = await labelFetcher.batchGetLabels(
        Array.from(urisToFetch),
        this.template.labels  // Use any labels already in template
    );
    
    // 4. Store fetched labels
    fetchedLabels.forEach((label, uri) => {
        if (!this.template.labels[uri]) {
            this.template.labels[uri] = label;
        }
    });
    
    console.log('✅ Fetched labels for', Object.keys(this.template.labels).length, 'URIs');
    
    return this.template;
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
  
  return await parser.parseWithLabels();
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

/**
 * Label Fetcher for fetching rdfs:label values from URIs
 */
class LabelFetcher {
  constructor() {
    this.cache = new Map();
  }

  async batchGetLabels(uris, localLabels = {}) {
    const results = new Map();
    
    const promises = uris.map(async uri => {
      // Check local labels first
      if (localLabels[uri]) {
        results.set(uri, localLabels[uri]);
        return;
      }
      
      // Check cache
      if (this.cache.has(uri)) {
        results.set(uri, this.cache.get(uri));
        return;
      }
      
      // Fetch label
      const label = await this.fetchLabel(uri);
      this.cache.set(uri, label);
      results.set(uri, label);
    });
    
    await Promise.all(promises);
    return results;
  }

  async fetchLabel(uri) {
    try {
      // Try to fetch the URI and look for rdfs:label
      const response = await fetch(uri, {
        headers: { 'Accept': 'text/turtle, application/rdf+xml, application/ld+json' }
      });
      
      if (!response.ok) {
        return this.parseUriLabel(uri);
      }
      
      const content = await response.text();
      
      // Simple pattern matching for rdfs:label
      const labelMatch = content.match(/rdfs:label\s+"([^"]+)"/);
      if (labelMatch) {
        return labelMatch[1];
      }
      
      // Fallback to parsing URI
      return this.parseUriLabel(uri);
    } catch (error) {
      // On error, parse URI
      return this.parseUriLabel(uri);
    }
  }

  parseUriLabel(uri) {
    const parts = uri.split(/[#\/]/);
    let label = parts[parts.length - 1];
    
    if (!label && parts.length > 1) {
      label = parts[parts.length - 2];
    }
    
    // Convert camelCase to Title Case
    label = label.replace(/([a-z])([A-Z])/g, '$1 $2');
    label = label.replace(/[_-]/g, ' ');
    label = label.trim();
    
    // Capitalize
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
}

export { LabelFetcher };

// Default export
export default TemplateParser;
