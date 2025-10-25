/**
 * Template Parser for Nanopub Templates
 * Handles parsing of RDF-based nanopublication templates
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
  }

  async parse() {
    if (!this.content) {
      throw new Error('No template content to parse');
    }

    this.parsePrefixes();
    this.parseTemplateMetadata();
    this.parseLabels();
    this.parsePlaceholders();
    await this.parsePlaceholderOptions();
    this.parseStatements();
    this.identifyRepeatablePlaceholders();
    
    return this.template;
  }

  parsePrefixes() {
    const prefixRegex = /@prefix\s+(\w+):\s+<([^>]+)>/g;
    let match;
    
    while ((match = prefixRegex.exec(this.content)) !== null) {
      this.template.prefixes[match[1]] = match[2];
    }
  }

  parseTemplateMetadata() {
    const assertionMatch = this.content.match(/sub:assertion\s+{([^}]+)}/s);
    if (!assertionMatch) return;

    const assertionBlock = assertionMatch[1];

    const labelMatch = assertionBlock.match(/sub:assertion[^}]*rdfs:label\s+"([^"]+)"/);
    if (labelMatch) {
      this.template.label = labelMatch[1];
    }

    const descMatch = assertionBlock.match(/dct:description\s+"([^"]+)"/);
    if (descMatch) {
      this.template.description = descMatch[1];
    }

    const patternMatch = assertionBlock.match(/nt:hasNanopubLabelPattern\s+"([^"]+)"/);
    if (patternMatch) {
      this.template.labelPattern = patternMatch[1];
    }

    const tagMatch = assertionBlock.match(/nt:hasTag\s+"([^"]+)"/);
    if (tagMatch) {
      this.template.tags = [tagMatch[1]];
    }
  }

  parseLabels() {
    const labelRegex = /(<[^>]+>|[\w:]+)\s+rdfs:label\s+"([^"]+)"\s*[;.]/g;
    let match;
    
    while ((match = labelRegex.exec(this.content)) !== null) {
      const uri = this.cleanUri(match[1]);
      const label = match[2];
      this.template.labels[uri] = label;
    }
  }

  parsePlaceholders() {
    const placeholderRegex = /(sub:\w+)\s+a\s+nt:(\w+Placeholder[^;]*);([^}]*?)(?=\n\s*(?:sub:\w+|rdf:|<|sub:assertion)|\n\s*$)/gs;
    let match;
    
    while ((match = placeholderRegex.exec(this.content)) !== null) {
      const id = match[1];
      const type = match[2].split(',')[0].trim();
      const block = match[0];
      
      const placeholder = {
        id: this.cleanUri(id),
        type: type,
        label: this.extractLabel(block),
        description: this.extractDescription(block),
        validation: this.extractValidation(block),
        possibleValuesFrom: null,
        possibleValuesFromApi: null,
        options: []
      };

      if (type.includes('RestrictedChoice')) {
        const valuesFromMatch = block.match(/nt:possibleValuesFrom\s+<([^>]+)>/);
        if (valuesFromMatch) {
          placeholder.possibleValuesFrom = valuesFromMatch[1];
        }
      }

      if (type.includes('GuidedChoice')) {
        const valuesFromApiMatch = block.match(/nt:possibleValuesFromApi\s+"([^"]+)"/);
        if (valuesFromApiMatch) {
          placeholder.possibleValuesFromApi = valuesFromApiMatch[1];
        }
      }

      this.template.placeholders.push(placeholder);
    }
  }

  async parsePlaceholderOptions() {
    for (const placeholder of this.template.placeholders) {
      if (placeholder.possibleValuesFrom) {
        try {
          const serverUri = placeholder.possibleValuesFrom
            .replace(/^https?:\/\/(w3id\.org|purl\.org)\/np\//, 'https://np.petapico.org/') + '.trig';
          
          const optionsNp = await fetch(serverUri);
          if (!optionsNp.ok) continue;
          
          const content = await optionsNp.text();
          const assertionMatch = content.match(/sub:assertion\s*{([^}]+)}/s);
          
          if (assertionMatch) {
            const assertionBlock = assertionMatch[1];
            const optionMatches = assertionBlock.matchAll(/<([^>]+)>\s+rdfs:label\s+"([^"]+)"/g);
            
            placeholder.options = [];
            for (const match of optionMatches) {
              placeholder.options.push({
                value: match[1],
                label: match[2]
              });
            }
          }
        } catch (e) {
          console.warn('Failed to fetch options for', placeholder.id, e);
        }
      }
    }
  }

  parseStatements() {
    const statementIds = this.findStatementIds();
    
    statementIds.forEach(stmtId => {
      const statement = this.parseStatement(stmtId);
      if (statement) {
        this.template.statements.push(statement);
      }
    });
  }

  findStatementIds() {
    const ids = new Set();
    
    const hasStmtRegex = /nt:hasStatement\s+([^;.]+)/g;
    let match;
    while ((match = hasStmtRegex.exec(this.content)) !== null) {
      const list = match[1].split(',').map(s => s.trim());
      list.forEach(item => {
        if (item.startsWith('sub:st')) ids.add(item);
      });
    }
    
    const standaloneRegex = /(sub:st\w+)\s+(?:a\s+nt:|rdf:)/g;
    while ((match = standaloneRegex.exec(this.content)) !== null) {
      ids.add(match[1]);
    }
    
    return Array.from(ids).sort();
  }

  parseStatement(stmtId) {
    const escaped = stmtId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const blockRegex = new RegExp(
      `${escaped}\\s+([\\s\\S]*?)(?=\\n\\s*(?:sub:\\w+|<[^>]+>)\\s+(?:a\\s+nt:|rdf:)|\\n\\s*}|$)`,
      'i'
    );
    
    const blockMatch = this.content.match(blockRegex);
    if (!blockMatch) return null;
    
    const block = blockMatch[1];
    
    const subjMatch = block.match(/rdf:subject\s+(<[^>]+>|[\w:]+)/);
    const predMatch = block.match(/rdf:predicate\s+(<[^>]+>|[\w:]+)/);
    const objMatch = block.match(/rdf:object\s+(<[^>]+>|[\w:]+)/);
    
    if (!subjMatch || !predMatch || !objMatch) return null;
    
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
    return uri.replace(/^<|>$/g, '')
              .replace(/^"|"$/g, '')
              .replace(/^sub:/, '')
              .trim();
  }

  identifyRepeatablePlaceholders() {
    const repeatableIds = new Set();
    
    this.template.statements.forEach(stmt => {
      if (stmt.repeatable) {
        if (stmt.object && !stmt.object.startsWith('http')) {
          repeatableIds.add(stmt.object);
        }
        if (stmt.predicate && !stmt.predicate.startsWith('http') && stmt.predicate !== 'rdf:type') {
          repeatableIds.add(stmt.predicate);
        }
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
    
    const minMatch = block.match(/nt:hasMinLength\s+"?(\d+)"?/);
    if (minMatch) validation.minLength = parseInt(minMatch[1]);
    
    const maxMatch = block.match(/nt:hasMaxLength\s+"?(\d+)"?/);
    if (maxMatch) validation.maxLength = parseInt(maxMatch[1]);
    
    return Object.keys(validation).length > 0 ? validation : undefined;
  }

  static async fetchAndParse(templateUri) {
    let fetchUrl = templateUri;
    if (templateUri.startsWith('http://purl.org/np/') || 
        templateUri.startsWith('https://w3id.org/np/')) {
      const npId = templateUri.split('/').pop();
      fetchUrl = `https://np.petapico.org/${npId}.trig`;
    }
    
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const content = await response.text();
    const parser = new TemplateParser(content);
    return await parser.parse();
  }
}

export default TemplateParser;
