/**
 * Template Parser for Nanopub Templates
 * Handles parsing of RDF-based nanopublication templates with multi-line statement support
 */

export class TemplateParser {
  constructor(content = '') {
    this.content = content;
    this.template = {
      uri: null,
      label: null,
      description: null,
      labelPattern: null,
      tags: [],
      prefixes: {},
      placeholders: [],
      statements: [],
      labels: {},
      repeatablePlaceholderIds: []
    };
    this.debug = true;
  }

  log(message) {
    if (this.debug) console.log(message);
  }

  async parse() {
    this.log('🔍 Starting template parsing...');
    
    if (!this.content) {
      throw new Error('No template content to parse');
    }

    // Parse in order
    this.parsePrefixes();
    this.parseTemplateMetadata();
    this.parseLabels();
    this.parsePlaceholders();
    this.parseStatements();
    this.identifyRepeatablePlaceholders();
    
    this.log('✅ Parsing complete!');
    return this.template;
  }

  parsePrefixes() {
    const prefixRegex = /@prefix\s+(\w+):\s+<([^>]+)>/g;
    let match;
    let count = 0;
    
    while ((match = prefixRegex.exec(this.content)) !== null) {
      this.template.prefixes[match[1]] = match[2];
      count++;
    }
    
    this.log(`✓ Parsed ${count} prefixes`);
  }

  parseTemplateMetadata() {
    // Find assertion template block
    const assertionMatch = this.content.match(/sub:assertion\s+{([^}]+)}/s);
    if (!assertionMatch) {
      this.log('⚠️  No assertion block found');
      return;
    }

    const assertionBlock = assertionMatch[1];

    // Extract template label
    const labelMatch = assertionBlock.match(/sub:assertion[^}]*rdfs:label\s+"([^"]+)"/);
    if (labelMatch) {
      this.template.label = labelMatch[1];
      this.log(`✓ Template: ${this.template.label}`);
    } else {
      this.log('✓ Template: Unnamed');
    }

    // Extract description
    const descMatch = assertionBlock.match(/dct:description\s+"([^"]+)"/);
    if (descMatch) {
      this.template.description = descMatch[1];
    }

    // Extract label pattern
    const patternMatch = assertionBlock.match(/nt:hasNanopubLabelPattern\s+"([^"]+)"/);
    if (patternMatch) {
      this.template.labelPattern = patternMatch[1];
    }

    // Extract tags
    const tagMatch = assertionBlock.match(/nt:hasTag\s+"([^"]+)"/);
    if (tagMatch) {
      this.template.tags = [tagMatch[1]];
    }
  }

  parseLabels() {
    // Parse inline label definitions (predicate/class labels)
    const labelRegex = /(<[^>]+>|[\w:]+)\s+rdfs:label\s+"([^"]+)"\s*[;.]/g;
    let match;
    let count = 0;
    
    while ((match = labelRegex.exec(this.content)) !== null) {
      const uri = this.cleanUri(match[1]);
      const label = match[2];
      this.template.labels[uri] = label;
      this.log(`  Found label: ${label} → ${uri}`);
      count++;
    }
    
    this.log(`✓ Found ${count} inline labels`);
  }

  parsePlaceholders() {
    // Match placeholder definitions with their full blocks
    const placeholderRegex = /(sub:\w+)\s+a\s+nt:(\w+Placeholder[^;]*);([^}]*?)(?=\n\s*(?:sub:\w+|rdf:|<|sub:assertion)|\n\s*$)/gs;
    let match;
    let count = 0;
    
    while ((match = placeholderRegex.exec(this.content)) !== null) {
      const id = match[1];
      const type = match[2].split(',')[0].trim(); // Handle multiple types
      const block = match[0];
      
      const placeholder = {
        id: this.cleanUri(id),
        type: type,
        label: this.extractLabel(block),
        description: this.extractDescription(block),
        validation: this.extractValidation(block)
      };

      // Add type-specific properties
      if (type.includes('RestrictedChoice') || type.includes('GuidedChoice')) {
        const valuesMatch = block.match(/nt:possibleValues(?:From(?:Api)?)\s+(<[^>]+>|"[^"]+")/);
        if (valuesMatch) {
          placeholder.possibleValuesFrom = this.cleanUri(valuesMatch[1]);
        }
      }

      this.template.placeholders.push(placeholder);
      this.log(`  Found placeholder: ${placeholder.label || id} (${type})`);
      count++;
    }
    
    this.log(`✓ Parsed ${count} placeholders`);
  }

  parseStatements() {
    this.log('🔧 Starting statement parsing...');
    
    // First, find all statement IDs
    const statementIds = this.findStatementIds();
    this.log(`  Found ${statementIds.length} statement IDs`);
    
    // Parse each statement
    let parsedCount = 0;
    statementIds.forEach(stmtId => {
      const statement = this.parseStatement(stmtId);
      if (statement) {
        this.template.statements.push(statement);
        this.log(`  ✅ Parsed: ${stmtId}`);
        parsedCount++;
      } else {
        this.log(`  ⚠️  Failed to parse: ${stmtId}`);
      }
    });
    
    this.log(`🎉 Total: ${parsedCount} statements`);
    this.log(`✓ Parsed ${parsedCount} statements`);
  }

  findStatementIds() {
    const ids = new Set();
    
    // Find from hasStatement declarations
    const hasStmtRegex = /nt:hasStatement\s+([^;.]+)/g;
    let match;
    while ((match = hasStmtRegex.exec(this.content)) !== null) {
      const list = match[1].split(',').map(s => s.trim());
      list.forEach(item => {
        if (item.startsWith('sub:st')) ids.add(item);
      });
    }
    
    // Find standalone statement definitions
    const standaloneRegex = /(sub:st\w+)\s+(?:a\s+nt:|rdf:)/g;
    while ((match = standaloneRegex.exec(this.content)) !== null) {
      ids.add(match[1]);
    }
    
    return Array.from(ids).sort();
  }

  parseStatement(stmtId) {
    // Create regex to match statement block - from stmtId until next statement or end
    const escaped = stmtId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Match the entire statement block including all properties
    // Stops at: next sub: definition, closing brace, or end of file
    const blockRegex = new RegExp(
      `${escaped}\\s+([\\s\\S]*?)(?=\\n\\s*(?:sub:\\w+|<[^>]+>)\\s+(?:a\\s+nt:|rdf:)|\\n\\s*}|$)`,
      'i'
    );
    
    const blockMatch = this.content.match(blockRegex);
    
    if (!blockMatch) {
      this.log(`  ⚠️  Not found: ${stmtId}`);
      return null;
    }
    
    const block = blockMatch[1];
    
    // Extract triple components - handle both semicolon and newline separated
    const subjMatch = block.match(/rdf:subject\s+(<[^>]+>|[\w:]+)/);
    const predMatch = block.match(/rdf:predicate\s+(<[^>]+>|[\w:]+)/);
    const objMatch = block.match(/rdf:object\s+(<[^>]+>|[\w:]+)/);
    
    if (!subjMatch || !predMatch || !objMatch) {
      this.log(`  ⚠️  Incomplete: ${stmtId}`);
      this.log(`     subj:${!!subjMatch} pred:${!!predMatch} obj:${!!objMatch}`);
      return null;
    }
    
    // Extract types for statement modifiers
    const typeMatch = block.match(/a\s+([^;.]+)/);
    const types = typeMatch ? typeMatch[1].split(',').map(t => t.trim()) : [];
    
    return {
      id: this.cleanUri(stmtId),
      subject: this.cleanUri(subjMatch[1]),
      predicate: this.cleanUri(predMatch[1]),
      object: this.cleanUri(objMatch[1]),
      repeatable: types.some(t => t.includes('RepeatableStatement')),
      optional: types.some(t => t.includes('OptionalStatement')),
      grouped: types.some(t => t.includes('GroupedStatement')),
      types: types
    };
  }

  cleanUri(uri) {
    if (!uri) return uri;
    return uri.replace(/^<|>$/g, '').replace(/^"|"$/g, '').trim();
  }

  identifyRepeatablePlaceholders() {
    const repeatableIds = new Set();
    
    this.template.statements.forEach(stmt => {
      if (stmt.repeatable && stmt.object.startsWith('sub:')) {
        repeatableIds.add(stmt.object.replace('sub:', ''));
      }
    });
    
    this.template.repeatablePlaceholderIds = Array.from(repeatableIds);
    this.log(`✓ Identified ${this.template.repeatablePlaceholderIds.length} repeatable placeholders`);
  }

  extractLabel(block) {
    const match = block.match(/rdfs:label\s+"([^"]+)"/);
    return match ? match[1] : null;
  }

  extractDescription(block) {
    const match = block.match(/dct:description\s+"([^"]+)"/);
    return match ? match[1] : null;
  }

  extractValidation(block) {
    const validation = {};
    
    const regexMatch = block.match(/nt:hasRegex\s+"([^"]+)"/);
    if (regexMatch) {
      validation.regex = regexMatch[1];
    }
    
    const minMatch = block.match(/nt:hasMinLength\s+"?(\d+)"?/);
    if (minMatch) {
      validation.minLength = parseInt(minMatch[1]);
    }
    
    const maxMatch = block.match(/nt:hasMaxLength\s+"?(\d+)"?/);
    if (maxMatch) {
      validation.maxLength = parseInt(maxMatch[1]);
    }
    
    return Object.keys(validation).length > 0 ? validation : undefined;
  }

  // Static method to fetch and parse a template from URL
  static async fetchAndParse(templateUri) {
    console.log('📥 Fetching template from:', templateUri);
    
    // Convert purl.org or w3id.org to nanopub server
    let fetchUrl = templateUri;
    if (templateUri.startsWith('http://purl.org/np/') || 
        templateUri.startsWith('https://w3id.org/np/')) {
      const npId = templateUri.split('/').pop();
      fetchUrl = `https://np.petapico.org/${npId}.trig`;
      console.log('🔄 Converted to nanopub server URI:', fetchUrl);
    }
    
    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const content = await response.text();
      console.log('✅ Template fetched successfully, length:', content.length);
      
      const parser = new TemplateParser(content);
      const template = await parser.parse();
      
      console.log('✅ Template parsed successfully');
      console.log('📊 Template stats:', {
        label: template.label,
        placeholders: template.placeholders.length,
        statements: template.statements.length,
        labels: Object.keys(template.labels).length
      });
      
      return template;
    } catch (error) {
      console.error('❌ Failed to fetch/parse template:', error);
      throw error;
    }
  }
}

// Export for use in other modules
export default TemplateParser;
