/**
 * WORKING Template Parser for Nanopublication Templates
 * 
 * Key fix: parseStatement() method properly handles multi-line statements
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

  async parse() {
    try {
      this.log('🔍 Starting template parsing...');
      
      this.parsePrefixes();
      this.log(`✓ Parsed ${Object.keys(this.prefixes).length} prefixes`);
      
      this.parseTemplateMetadata();
      this.log(`✓ Template: ${this.template.label || 'Unnamed'}`);
      
      this.parseInlineLabels();
      this.log(`✓ Found ${Object.keys(this.template.labels).length} inline labels`);
      
      this.parsePlaceholders();
      this.log(`✓ Parsed ${this.template.placeholders.length} placeholders`);
      
      this.parseStatements();
      this.log(`✓ Parsed ${this.template.statements.length} statements`);
      
      this.identifyRepeatablePlaceholders();
      this.log(`✓ Identified ${this.template.repeatablePlaceholderIds.length} repeatable placeholders`);
      
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

  parsePrefixes() {
    const prefixRegex = /@prefix\s+(\w+):\s+<([^>]+)>\s*\./g;
    let match;
    while ((match = prefixRegex.exec(this.content)) !== null) {
      this.prefixes[match[1]] = match[2];
    }
  }

  parseTemplateMetadata() {
    const thisMatch = this.content.match(/@prefix\s+this:\s+<([^>]+)>/);
    if (thisMatch) this.template.uri = thisMatch[1];
    
    const labelMatch = this.content.match(/(?:a\s+nt:AssertionTemplate[^;]*;[^;]*rdfs:label\s+"([^"]+)"|rdfs:label\s+"([^"]+)"[^;]*;[^;]*a\s+nt:AssertionTemplate)/);
    if (labelMatch) this.template.label = labelMatch[1] || labelMatch[2];
    
    const descMatch = this.content.match(/dct:description\s+"""([^"]+?)"""/s);
    if (descMatch) this.template.description = descMatch[1].trim();
    
    const patternMatch = this.content.match(/nt:hasNanopubLabelPattern\s+"([^"]+)"/);
    if (patternMatch) this.template.labelPattern = patternMatch[1];
    
    const tagMatch = this.content.match(/nt:hasTag\s+([^;.]+)/);
    if (tagMatch) {
      this.template.tags = tagMatch[1].split(',').map(tag => tag.trim().replace(/^"|"$/g, ''));
    }
  }

  parseInlineLabels() {
    const labelRegex = /(<[^>]+>|[\w:]+)\s+rdfs:label\s+"([^"]+)"\s*[;.]/g;
    let match;
    while ((match = labelRegex.exec(this.content)) !== null) {
      let uri = match[1].trim();
      const label = match[2].trim();
      if (uri.startsWith('<') && uri.endsWith('>')) {
        uri = uri.slice(1, -1);
      }
      this.template.labels[uri] = label;
      this.log(`  Found label: ${label} → ${uri}`);
    }
  }

  parsePlaceholders() {
    const placeholderRegex = /(sub:\w+|<[^>]+>)\s+a\s+nt:(\w+Placeholder[^;]*);([^}]+?)(?=sub:\w+\s+a\s+nt:|\}|$)/gs;
    let match;
    while ((match = placeholderRegex.exec(this.content)) !== null) {
      const id = match[1].replace(/^sub:|[<>]/g, '');
      const typesString = match[2];
      const block = match[3];
      
      const types = typesString.split(',').map(t => t.trim());
      const placeholder = {
        id: id,
        type: types[0],
        types: types,
        label: this.extractLabel(block),
        description: this.extractDescription(block),
        required: !types.includes('nt:OptionalStatement'),
        validation: this.extractValidation(block),
        options: this.extractOptions(block)
      };
      
      this.template.placeholders.push(placeholder);
      this.log(`  Found placeholder: ${placeholder.label || placeholder.id} (${placeholder.type})`);
    }
  }

  /**
   * FIXED: Parse statements - handles multi-line format
   */
  parseStatements() {
    this.log('🔧 Starting statement parsing...');
    
    // Find all statement IDs
    const ids = this.findAllStatementIds();
    this.log(`  Found ${ids.length} statement IDs`);
    
    // Parse each statement
    const statements = [];
    for (const id of ids) {
      const stmt = this.parseStatement(id);
      if (stmt) {
        statements.push(stmt);
        this.log(`  ✅ Parsed: ${id}`);
      }
    }
    
    this.template.statements = statements;
    this.log(`🎉 Total: ${statements.length} statements`);
  }

  findAllStatementIds() {
    const ids = new Set();
    
    // From nt:hasStatement lists
    const hasStmtRegex = /nt:hasStatement\s+([^;.]+)/g;
    let match;
    while ((match = hasStmtRegex.exec(this.content)) !== null) {
      const list = match[1].split(',').map(s => s.trim());
      list.forEach(item => {
        if (item.startsWith('sub:')) ids.add(item);
      });
    }
    
    // Standalone definitions
    const standaloneRegex = /(sub:st\w+)\s+rdf:/g;
    while ((match = standaloneRegex.exec(this.content)) !== null) {
      ids.add(match[1]);
    }
    
    return Array.from(ids);
  }

  /**
   * Parse single statement - handles multi-line definitions
   */
  parseStatement(stmtId) {
    // Match from stmtId to next sub: or closing }
    const escaped = stmtId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`${escaped}\\s+([\\s\\S]*?)(?=\\n\\s*sub:\\w+|\\n\\s*\\}|$)`, 'i');
    const match = this.content.match(regex);
    
    if (!match) {
      this.log(`  ⚠️  Not found: ${stmtId}`);
      return null;
    }
    
    const block = match[1];
    
    // Extract triple components - allow whitespace and semicolons
    const subjMatch = block.match(/rdf:subject\s+([^;\s]+)/);
    const predMatch = block.match(/rdf:predicate\s+(<[^>]+>|[^;\s]+)/);
    const objMatch = block.match(/rdf:object\s+(<[^>]+>|[^;\s]+)/);
    
    if (!subjMatch || !predMatch || !objMatch) {
      this.log(`  ⚠️  Incomplete: ${stmtId}`);
      this.log(`     subj:${!!subjMatch} pred:${!!predMatch} obj:${!!objMatch}`);
      return null;
    }
    
    // Check types
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
    return uri.replace(/^<|>$/g, '').trim();
  }

  identifyRepeatablePlaceholders() {
    const repeatableIds = new Set();
    this.template.statements.forEach(stmt => {
      if (stmt.repeatable && stmt.object.startsWith('sub:')) {
        repeatableIds.add(stmt.object.replace('sub:', ''));
      }
    });
    this.template.repeatablePlaceholderIds = Array.from(repeatableIds);
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
    if (regexMatch) validation.regex = regexMatch[1];
    return Object.keys(validation).length > 0 ? validation : null;
  }

  extractOptions(block) {
    const valuesMatch = block.match(/nt:possibleValuesFrom\s+<([^>]+)>/);
    if (valuesMatch) return { valuesFrom: valuesMatch[1] };
    
    const apiMatch = block.match(/nt:possibleValuesFromApi\s+"([^"]+)"/);
    if (apiMatch) return { apiUrl: apiMatch[1] };
    
    return null;
  }

  async fetchExternalLabels() {
    if (!this.options.fetchExternalLabels) return;
    this.log('🌐 Fetching external labels...');
    
    const fetcher = new LabelFetcher({ timeout: this.options.timeout });
    const urisToFetch = new Set();
    
    this.template.statements.forEach(stmt => {
      [stmt.subject, stmt.predicate, stmt.object].forEach(uri => {
        if (uri && uri.startsWith('http') && !this.template.labels[uri]) {
          urisToFetch.add(uri);
        }
      });
    });
    
    if (urisToFetch.size > 0) {
      try {
        const labels = await fetcher.fetchBatch(Array.from(urisToFetch));
        Object.assign(this.template.labels, labels);
        this.log(`  ✓ Fetched ${Object.keys(labels).length} labels`);
      } catch (error) {
        this.log(`  ⚠️  Error: ${error.message}`);
      }
    }
  }

  log(...args) {
    if (this.options.debug) console.log(...args);
  }

  error(...args) {
    console.error(...args);
    this.errors.push(args.join(' '));
  }
}

export async function parseTemplateFromUri(uri, options = {}) {
  console.log('📥 Fetching template from:', uri);
  
  let fetchUri = uri;
  if (uri.includes('purl.org/np/')) {
    const npId = uri.split('/np/')[1];
    fetchUri = `https://np.petapico.org/${npId}.trig`;
    console.log('🔄 Converted to nanopub server URI:', fetchUri);
  }
  
  try {
    const response = await fetch(fetchUri, {
      headers: { 'Accept': 'application/trig, text/turtle' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed: ${response.status} ${response.statusText}`);
    }
    
    const content = await response.text();
    console.log('✅ Template fetched successfully, length:', content.length);
    
    const parser = new TemplateParser(content, {
      debug: true,
      ...options
    });
    
    const result = await parser.parse();
    console.log('✅ Template parsed successfully');
    console.log('📊 Template stats:', {
      label: result.label,
      placeholders: result.placeholders.length,
      statements: result.statements.length,
      labels: Object.keys(result.labels).length
    });
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

export { TemplateParser as default };
