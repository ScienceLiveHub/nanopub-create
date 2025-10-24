/**
 * Improved Template Parser for Nanopublication Templates
 * 
 * FIXES:
 * 1. Handles both sub:id and <full-uri#id> statement formats
 * 2. Parses inline labels from assertion block FIRST
 * 3. Supports all placeholder types including GuidedChoice, AutoEscape, etc.
 * 4. Handles multiple types per placeholder (comma-separated)
 * 5. Better error handling and validation
 */

import { LabelFetcher } from './labelFetcher.js';

export class TemplateParser {
  constructor(content, options = {}) {
    this.content = content;
    this.options = {
      debug: false,
      fetchExternalLabels: true,
      timeout: 10000,
      ...options
    };
    this.prefixes = {};
    this.template = {
      uri: null,
      label: null,
      description: null,
      labelPattern: null,
      tags: [],
      placeholders: [],
      statements: [],
      statementOrder: [],
      repeatablePlaceholderIds: [],
      labels: {}
    };
    this.errors = [];
  }

  /**
   * Main parse method with comprehensive error handling
   */
  async parse() {
    try {
      this.log('🔍 Starting template parsing...');
      
      // Step 1: Parse structure
      this.parsePrefixes();
      this.log(`✓ Parsed ${Object.keys(this.prefixes).length} prefixes`);
      
      this.parseTemplateMetadata();
      this.log(`✓ Template: ${this.template.label || 'Unnamed'}`);
      
      // Step 2: Parse inline labels FIRST (critical!)
      this.parseInlineLabels();
      this.log(`✓ Found ${Object.keys(this.template.labels).length} inline labels`);
      
      // Step 3: Parse placeholders
      this.parsePlaceholders();
      this.log(`✓ Parsed ${this.template.placeholders.length} placeholders`);
      
      // Step 4: Parse statements
      this.parseStatements();
      this.log(`✓ Parsed ${this.template.statements.length} statements`);
      
      // Step 5: Identify repeatable placeholders
      this.identifyRepeatablePlaceholders();
      this.log(`✓ Identified ${this.template.repeatablePlaceholderIds.length} repeatable placeholders`);
      
      // Step 6: Fetch external labels if enabled
      if (this.options.fetchExternalLabels) {
        await this.fetchExternalLabels();
      }
      
      this.log('✅ Parsing complete!');
      return this.template;
      
    } catch (error) {
      this.error('❌ Parsing failed:', error);
      throw new Error(`Template parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse inline labels from assertion block
   * CRITICAL FIX: Many templates define labels inline
   */
  parseInlineLabels() {
    // Pattern: <URI> rdfs:label "Label text" or prefix:id rdfs:label "Label"
    const labelRegex = /(<[^>]+>|[\w:]+)\s+rdfs:label\s+"([^"]+)"\s*[;.]/g;
    let match;
    
    while ((match = labelRegex.exec(this.content)) !== null) {
      const [, uri, label] = match;
      const expandedUri = this.expandUri(uri);
      
      // Store the label
      this.template.labels[expandedUri] = label;
      
      // Also store with original format if different
      if (uri !== expandedUri) {
        this.template.labels[uri] = label;
      }
    }
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
    // Template URI
    const uriMatch = this.content.match(/@prefix\s+this:\s+<([^>]+)>/);
    if (uriMatch) {
      this.template.uri = uriMatch[1];
    }

    // Find the AssertionTemplate block
    const assertionTemplateRegex = /(\S+)\s+a\s+nt:AssertionTemplate[^}]*/s;
    const templateMatch = this.content.match(assertionTemplateRegex);
    
    if (templateMatch) {
      const templateBlock = templateMatch[0];
      
      // Label
      const labelMatch = templateBlock.match(/rdfs:label\s+"([^"]+)"/);
      if (labelMatch) {
        this.template.label = labelMatch[1];
      }

      // Description (may be multiline)
      const descMatch = templateBlock.match(/dct:description\s+"""([^"]*)"""/s) ||
                        templateBlock.match(/dct:description\s+"([^"]+)"/);
      if (descMatch) {
        this.template.description = descMatch[1].trim();
      }

      // Label pattern
      const patternMatch = templateBlock.match(/nt:hasNanopubLabelPattern\s+"([^"]+)"/);
      if (patternMatch) {
        this.template.labelPattern = patternMatch[1];
      }

      // Statement order
      const stmtOrderMatch = templateBlock.match(/nt:hasStatement\s+([^;.]+)/);
      if (stmtOrderMatch) {
        this.template.statementOrder = stmtOrderMatch[1]
          .split(',')
          .map(s => s.trim())
          .map(s => this.extractId(s));
      }

      // Tags
      const tagRegex = /nt:hasTag\s+"([^"]+)"/g;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(templateBlock)) !== null) {
        this.template.tags.push(tagMatch[1]);
      }
    }
  }

  /**
   * Parse all placeholders with support for ALL types
   */
  parsePlaceholders() {
    const placeholderTypes = [
      'LiteralPlaceholder',
      'LongLiteralPlaceholder',
      'ExternalUriPlaceholder',
      'TrustyUriPlaceholder',
      'RestrictedChoicePlaceholder',
      'GuidedChoicePlaceholder',      // NEW
      'AutoEscapeUriPlaceholder',     // NEW
      'IntroducedResource',            // NEW
      'LocalResource',                 // NEW
      'ValuePlaceholder',
      'UriPlaceholder'
    ];

    // Build a single regex to find all placeholder declarations
    // Pattern: sub:id or <full-uri> followed by 'a' and type(s)
    const placeholderRegex = /(?:sub:(\w+)|<([^>]+#\w+)>)\s+a\s+([^;]+);([^}]*?)(?=(?:sub:\w+|<[^>]+>)\s+a\s+|$)/gs;
    
    let match;
    while ((match = placeholderRegex.exec(this.content)) !== null) {
      const [, subId, fullUri, types, block] = match;
      const id = subId || this.extractId(fullUri);
      const typesList = types.split(',').map(t => t.trim());
      
      // Check if any type matches our known placeholder types
      const matchedTypes = typesList.filter(t => 
        placeholderTypes.some(pt => t.includes(pt))
      );
      
      if (matchedTypes.length > 0) {
        const placeholder = this.parsePlaceholderBlock(id, matchedTypes, block, fullUri || `sub:${id}`);
        if (placeholder) {
          this.template.placeholders.push(placeholder);
        }
      }
    }
  }

  /**
   * Parse a single placeholder block
   */
  parsePlaceholderBlock(id, types, block, fullUri) {
    const primaryType = types[0].split(':').pop(); // Get type without prefix
    const secondaryTypes = types.slice(1).map(t => t.split(':').pop());
    
    const placeholder = {
      id,
      fullUri,
      type: primaryType,
      secondaryTypes,
      label: null,
      description: null,
      required: true,
      validation: {}
    };

    // Extract label
    const labelMatch = block.match(/rdfs:label\s+"([^"]+)"/);
    if (labelMatch) {
      placeholder.label = labelMatch[1];
    }

    // Extract description
    const descMatch = block.match(/dct:description\s+"([^"]+)"/);
    if (descMatch) {
      placeholder.description = descMatch[1];
    }

    // Extract regex validation
    const regexMatch = block.match(/nt:hasRegex\s+"([^"]+)"/);
    if (regexMatch) {
      placeholder.validation.regex = regexMatch[1];
    }

    // Extract optional flag
    const optionalMatch = block.match(/nt:isOptional\s+true/);
    if (optionalMatch) {
      placeholder.required = false;
    }

    // Type-specific parsing
    switch (primaryType) {
      case 'RestrictedChoicePlaceholder':
        this.parseRestrictedChoice(placeholder, block);
        break;
        
      case 'GuidedChoicePlaceholder':
        this.parseGuidedChoice(placeholder, block);
        break;
        
      case 'AutoEscapeUriPlaceholder':
        this.parseAutoEscapeUri(placeholder, block);
        break;
        
      case 'IntroducedResource':
      case 'LocalResource':
        this.parseLocalResource(placeholder, block);
        break;
    }

    return placeholder;
  }

  /**
   * Parse RestrictedChoicePlaceholder options
   */
  parseRestrictedChoice(placeholder, block) {
    placeholder.options = [];
    
    // Inline values: nt:possibleValue "value1", "value2"
    const inlineRegex = /nt:possibleValue\s+"([^"]+)"/g;
    let match;
    while ((match = inlineRegex.exec(block)) !== null) {
      placeholder.options.push({
        value: match[1],
        label: match[1]
      });
    }
    
    // From nanopub: nt:possibleValuesFrom <URI>
    const fromNpMatch = block.match(/nt:possibleValuesFrom\s+<([^>]+)>/);
    if (fromNpMatch) {
      placeholder.possibleValuesFrom = fromNpMatch[1];
    }
  }

  /**
   * Parse GuidedChoicePlaceholder with API source
   */
  parseGuidedChoice(placeholder, block) {
    placeholder.options = [];
    
    // API endpoint(s): nt:possibleValuesFromApi "url1", "url2"
    const apiRegex = /nt:possibleValuesFromApi\s+"([^"]+)"/g;
    placeholder.apiSources = [];
    let match;
    while ((match = apiRegex.exec(block)) !== null) {
      placeholder.apiSources.push(match[1]);
    }
  }

  /**
   * Parse AutoEscapeUriPlaceholder
   */
  parseAutoEscapeUri(placeholder, block) {
    // Extract prefix for URI generation
    const prefixMatch = block.match(/nt:hasPrefix\s+"([^"]+)"/);
    if (prefixMatch) {
      placeholder.uriPrefix = prefixMatch[1];
    }
    
    const prefixLabelMatch = block.match(/nt:hasPrefixLabel\s+"([^"]+)"/);
    if (prefixLabelMatch) {
      placeholder.prefixLabel = prefixLabelMatch[1];
    }
  }

  /**
   * Parse local resource (blank node or introduced resource)
   */
  parseLocalResource(placeholder, block) {
    placeholder.isLocal = true;
    placeholder.generateBlankNode = true;
  }

  /**
   * Parse statement patterns
   * CRITICAL FIX: Handle both sub:id and <full-uri#id> formats
   */
  parseStatements() {
    const statements = [];

    // Updated regex to handle both formats
    const statementRegex = /(?:sub:(\w+)|<([^>]+#\w+)>)\s+(?:rdf:object\s+([^;]+);\s*rdf:predicate\s+([^;]+);\s*rdf:subject\s+([^.\s;]+)|a\s+[^;]*nt:(?:Repeatable|Optional|Grouped)Statement[^.]*\.)/gs;
    
    let match;
    while ((match = statementRegex.exec(this.content)) !== null) {
      const [fullMatch, subId, fullUri] = match;
      const id = subId || this.extractId(fullUri);
      
      // Find the complete block for this statement
      const blockStart = this.content.indexOf(fullMatch);
      const blockEnd = this.findStatementBlockEnd(blockStart);
      const block = this.content.substring(blockStart, blockEnd);
      
      // Extract triple pattern
      const objectMatch = block.match(/rdf:object\s+([^;]+)/);
      const predicateMatch = block.match(/rdf:predicate\s+([^;]+)/);
      const subjectMatch = block.match(/rdf:subject\s+([^;.\s]+)/);
      
      if (objectMatch && predicateMatch && subjectMatch) {
        const statement = {
          id,
          fullUri: fullUri || `sub:${id}`,
          subject: subjectMatch[1].trim(),
          predicate: predicateMatch[1].trim(),
          object: objectMatch[1].trim(),
          repeatable: /nt:RepeatableStatement/.test(block),
          optional: /nt:OptionalStatement/.test(block),
          grouped: /nt:GroupedStatement/.test(block)
        };

        // Link placeholders
        this.linkStatementPlaceholders(statement);
        
        statements.push(statement);
      }
    }

    // Sort by statement order if specified
    if (this.template.statementOrder.length > 0) {
      statements.sort((a, b) => {
        const aIndex = this.template.statementOrder.indexOf(a.id);
        const bIndex = this.template.statementOrder.indexOf(b.id);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    }

    this.template.statements = statements;
  }

  /**
   * Find the end of a statement block
   */
  findStatementBlockEnd(startPos) {
    let depth = 0;
    let inString = false;
    
    for (let i = startPos; i < this.content.length; i++) {
      const char = this.content[i];
      
      if (char === '"' && this.content[i-1] !== '\\') {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{') depth++;
        if (char === '}') depth--;
        if (char === '.' && depth === 0) {
          return i + 1;
        }
      }
    }
    
    return this.content.length;
  }

  /**
   * Link statement parts to placeholders
   */
  linkStatementPlaceholders(statement) {
    // Check subject
    const subjectId = this.extractId(statement.subject);
    const subjectPlaceholder = this.template.placeholders.find(p => p.id === subjectId);
    if (subjectPlaceholder) {
      statement.subjectIsPlaceholder = true;
      statement.subjectPlaceholder = subjectPlaceholder;
    }

    // Check predicate
    const predicateId = this.extractId(statement.predicate);
    const predicatePlaceholder = this.template.placeholders.find(p => p.id === predicateId);
    if (predicatePlaceholder) {
      statement.predicateIsPlaceholder = true;
      statement.predicatePlaceholder = predicatePlaceholder;
    }

    // Check object
    const objectId = this.extractId(statement.object);
    const objectPlaceholder = this.template.placeholders.find(p => p.id === objectId);
    if (objectPlaceholder) {
      statement.objectIsPlaceholder = true;
      statement.objectPlaceholder = objectPlaceholder;
    }
  }

  /**
   * Identify placeholders used in repeatable statements
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
   * Fetch external labels for URIs not found inline
   */
  async fetchExternalLabels() {
    const urisToFetch = new Set();
    
    // Collect URIs that don't have labels yet
    this.template.statements.forEach(statement => {
      if (statement.predicate.startsWith('http') && !this.template.labels[statement.predicate]) {
        urisToFetch.add(statement.predicate);
      }
      if (statement.subject.startsWith('http') && !this.template.labels[statement.subject]) {
        urisToFetch.add(statement.subject);
      }
      if (statement.object.startsWith('http') && !this.template.labels[statement.object]) {
        urisToFetch.add(statement.object);
      }
    });
    
    if (urisToFetch.size === 0) {
      this.log('✓ No external labels to fetch');
      return;
    }
    
    this.log(`🌐 Fetching ${urisToFetch.size} external labels...`);
    
    try {
      const labelFetcher = new LabelFetcher({ timeout: this.options.timeout });
      const fetchedLabels = await labelFetcher.batchGetLabels(
        Array.from(urisToFetch),
        this.template.labels
      );
      
      fetchedLabels.forEach((label, uri) => {
        if (!this.template.labels[uri]) {
          this.template.labels[uri] = label;
        }
      });
      
      this.log(`✓ Fetched ${fetchedLabels.size} external labels`);
    } catch (error) {
      this.log(`⚠️ Failed to fetch some external labels: ${error.message}`);
      // Don't fail parsing if external fetch fails
    }
  }

  /**
   * Extract ID from URI (handles both formats)
   */
  extractId(uri) {
    if (!uri) return null;
    
    // Handle sub:id format
    if (uri.startsWith('sub:')) {
      return uri.replace('sub:', '');
    }
    
    // Handle <full-uri#id> format
    if (uri.includes('#')) {
      const parts = uri.split('#');
      return parts[parts.length - 1].replace('>', '');
    }
    
    // Handle <full-uri/id> format
    if (uri.includes('/')) {
      const parts = uri.split('/');
      return parts[parts.length - 1].replace('>', '');
    }
    
    return uri.replace(/[<>]/g, '');
  }

  /**
   * Expand prefixed URI to full URI
   */
  expandUri(prefixedUri) {
    if (!prefixedUri) return prefixedUri;
    
    // Already a full URI
    if (prefixedUri.startsWith('http') || prefixedUri.startsWith('<')) {
      return prefixedUri.replace(/[<>]/g, '');
    }
    
    // Expand prefix:localName
    const colonIndex = prefixedUri.indexOf(':');
    if (colonIndex > 0) {
      const prefix = prefixedUri.substring(0, colonIndex);
      const localName = prefixedUri.substring(colonIndex + 1);
      
      if (this.prefixes[prefix]) {
        return this.prefixes[prefix] + localName;
      }
    }
    
    return prefixedUri;
  }

  /**
   * Logging helper
   */
  log(...args) {
    if (this.options.debug) {
      console.log('[TemplateParser]', ...args);
    }
  }

  /**
   * Error helper
   */
  error(...args) {
    console.error('[TemplateParser ERROR]', ...args);
    this.errors.push(args.join(' '));
  }

  /**
   * Get parsing errors
   */
  getErrors() {
    return this.errors;
  }
}

/**
 * Utility function to parse template from URI
 */
export async function parseTemplateFromUri(templateUri, options = {}) {
  try {
    const response = await fetch(templateUri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }

    const content = await response.text();
    const parser = new TemplateParser(content, options);
    
    return await parser.parse();
  } catch (error) {
    console.error('Failed to parse template from URI:', error);
    throw error;
  }
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
    if (!placeholder.label && !placeholder.description) {
      errors.push(`Placeholder ${placeholder.id} has no label or description`);
    }
  });

  // Validate statements
  template.statements?.forEach((statement, index) => {
    if (!statement.subject || !statement.predicate || !statement.object) {
      errors.push(`Statement ${statement.id || index} is incomplete`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
