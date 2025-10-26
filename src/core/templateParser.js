/**
 * Template Parser for Nanopub Templates 
 * - Handles hyphens in placeholder IDs
 * - Finds placeholders anywhere in file (not just in assertion block)
 * - Properly parses grouped statements
 * - Loads RestrictedChoice options correctly
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
      types: [],  // Nanopub types from nt:hasTargetNanopubType
      prefixes: {},
      placeholders: [],
      statements: [],
      labels: {},
      repeatablePlaceholderIds: [],
      groupedStatements: []
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
    
    console.log('✅ Template parsed:', {
      label: this.template.label,
      labelPattern: this.template.labelPattern,
      types: this.template.types.length,
      placeholders: this.template.placeholders.length,
      statements: this.template.statements.length
    });
    
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

    const descMatch = this.content.match(/dct:description\s+"([^"]+)"/);
    if (descMatch) {
      this.template.description = descMatch[1];
    }

    const patternMatch = this.content.match(/nt:hasNanopubLabelPattern\s+"([^"]+)"/);
    if (patternMatch) {
      this.template.labelPattern = patternMatch[1];
      console.log(`✅ Found label pattern: "${patternMatch[1]}"`);
    } else {
      console.warn('⚠️ No nt:hasNanopubLabelPattern found in template');
    }

    const tagMatch = this.content.match(/nt:hasTag\s+"([^"]+)"/);
    if (tagMatch) {
      this.template.tags = [tagMatch[1]];
    }

    // Parse nt:hasTargetNanopubType - search ENTIRE content, not just assertion
    const typesMatch = this.content.match(/nt:hasTargetNanopubType\s+(.+?)\s*[;.](?:\s|$)/s);
    if (typesMatch) {
      const typesStr = typesMatch[1];
      // Extract URIs in angle brackets: <http://...>, <http://...>
      const uriRegex = /<([^>]+)>/g;
      const types = [];
      let uriMatch;
      while ((uriMatch = uriRegex.exec(typesStr)) !== null) {
        types.push(uriMatch[1]);
      }
      this.template.types = types;
      
      console.log(`✅ Found ${types.length} target nanopub types:`, types);
    } else {
      console.warn('⚠️ No nt:hasTargetNanopubType found in template');
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
    console.log('Parsing placeholders...');
    
    // Match both Placeholder types AND Resource types (LocalResource, IntroducedResource, etc)
    // Handle both semicolon (;) and period (.) endings
    const placeholderRegex = /(sub:[\w-]+)\s+a\s+nt:([\w,\s]+(Placeholder|Resource)[^;.\n]*)[;.]/g;
    let match;
    
    while ((match = placeholderRegex.exec(this.content)) !== null) {
      const id = match[1];
      const typeStr = match[2].trim();
      const startPos = match.index;
      
      // Extract the full block for this placeholder
      // Block ends at NEXT placeholder declaration OR at closing brace
      let endPos = this.content.length;
      const remainingContent = this.content.substring(startPos);
      
      // Look for next "sub:something a nt:" pattern or closing brace
      const nextMatch = remainingContent.substring(1).search(/\n\s*(?:sub:[\w-]+\s+a\s+nt:|})/) ;
      if (nextMatch > 0) {
        endPos = startPos + nextMatch + 1;
      }
      
      const block = this.content.substring(startPos, endPos);
      
      console.log(`\n--- Parsing ${id} ---`);
      console.log(`Block length: ${block.length} chars`);
      console.log(`Block preview: ${block.substring(0, 200)}...`);
      
      // Handle multiple types
      const types = typeStr.split(',').map(t => t.trim());
      const primaryType = types[0].replace(/^nt:/, '');
      
      const placeholder = {
        id: this.cleanUri(id),
        type: primaryType,
        isLocalResource: types.some(t => t.includes('LocalResource')),
        label: this.extractLabel(block),
        description: this.extractDescription(block),
        validation: this.extractValidation(block),
        possibleValuesFrom: null,
        possibleValuesFromApi: null,
        options: []
      };

      // Handle RestrictedChoicePlaceholder
      if (primaryType.includes('RestrictedChoice')) {
        // Match both <URL> and prefix:id formats
        const valuesFromMatch = block.match(/nt:possibleValuesFrom\s+(?:<([^>]+)>|([\w-]+:[\w-]+))/);
        if (valuesFromMatch) {
          const url = valuesFromMatch[1] || valuesFromMatch[2];
          // If it's a prefixed URI, we need to expand it
          if (url && url.includes(':') && !url.startsWith('http')) {
            // Extract prefix and expand
            const [prefix, localPart] = url.split(':');
            const prefixMatch = this.content.match(new RegExp(`@prefix ${prefix}:\\s+<([^>]+)>`));
            if (prefixMatch) {
              placeholder.possibleValuesFrom = prefixMatch[1] + localPart;
            } else {
              placeholder.possibleValuesFrom = url; // Keep as-is if can't expand
            }
          } else {
            placeholder.possibleValuesFrom = url;
          }
          console.log(`  → Will fetch options from: ${placeholder.possibleValuesFrom}`);
        }
        
        // Also check for inline possibleValue (can be on multiple lines)
        // Match: nt:possibleValue <url1>, <url2>, <url3> .
        // Fixed: Don't stop at dots inside URLs, only at line-end period
        const possibleValueMatch = block.match(/nt:possibleValue\s+([\s\S]+?)(?:\s+\.(?:\s|$))/);
        if (possibleValueMatch) {
          const valueText = possibleValueMatch[1];
          console.log(`  → Raw value text: ${valueText.substring(0, 100)}...`);
          const inlineValues = [];
          // Match both <URL> and prefix:reference (any prefix like sub:, npx:, etc.)
          const valueRegex = /<([^>]+)>|([\w-]+:[\w-]+)/g;
          let valueMatch;
          while ((valueMatch = valueRegex.exec(valueText)) !== null) {
            inlineValues.push(valueMatch[1] || valueMatch[2]);
          }
          if (inlineValues.length > 0) {
            placeholder.options = inlineValues.map(v => {
              // First check if there's a label in template.labels
              let label = this.template.labels[v];
              
              if (!label) {
                // Fallback to generating label from URI or prefixed value
                if (v.startsWith('http')) {
                  label = v.replace(/^https?:\/\//, '').replace(/\/$/, '');
                  label = label.charAt(0).toUpperCase() + label.slice(1);
                } else if (v.includes(':')) {
                  // Has a namespace prefix (sub:, npx:, etc.) - use the local part
                  label = v.split(':')[1];
                } else {
                  label = v;
                }
              }
              
              return { value: v, label: label };
            });
            console.log(`  → Found ${placeholder.options.length} inline options:`, placeholder.options.map(o => o.label));
          } else {
            console.warn(`  → No values found in possibleValue text`);
          }
        }
      }

      // Handle GuidedChoicePlaceholder
      if (primaryType.includes('GuidedChoice')) {
        const valuesFromApiMatch = block.match(/nt:possibleValuesFromApi\s+"([^"]+)"/);
        if (valuesFromApiMatch) {
          placeholder.possibleValuesFromApi = valuesFromApiMatch[1];
        }
      }

      console.log(`Found placeholder: ${placeholder.id} (${placeholder.type})`);
      this.template.placeholders.push(placeholder);
    }
    
    console.log(`Total placeholders found: ${this.template.placeholders.length}`);
  }

  async parsePlaceholderOptions() {
    for (const placeholder of this.template.placeholders) {
      if (placeholder.possibleValuesFrom && placeholder.options.length === 0) {
        try {
          const serverUri = placeholder.possibleValuesFrom
            .replace(/^https?:\/\/(w3id\.org|purl\.org)\/np\//, 'https://np.petapico.org/') + '.trig';
          
          console.log(`Fetching options for ${placeholder.id} from ${serverUri}`);
          
          const optionsNp = await fetch(serverUri);
          if (!optionsNp.ok) {
            console.warn(`Failed to fetch options: HTTP ${optionsNp.status}`);
            continue;
          }
          
          const content = await optionsNp.text();
          console.log(`  → Fetched ${content.length} chars`);
          
          // Search the entire content for options
          // Options can be in two formats:
          // 1. Full URI: <http://example.org/intent> rdfs:label "Label"
          // 2. Prefixed URI: sub:intent rdfs:label "Label"
          
          // First, extract the base URI for this nanopub to expand sub: prefixes
          let baseUri = '';
          const subPrefixMatch = content.match(/@prefix sub:\s+<([^>]+)>/);
          if (subPrefixMatch) {
            baseUri = subPrefixMatch[1];
          }
          
          // Match both formats
          const fullUriPattern = /<([^>]+)>\s+rdfs:label\s+"([^"]+)"/g;
          const prefixedPattern = /(sub:[\w-]+)\s+rdfs:label\s+"([^"]+)"/g;
          
          placeholder.options = [];
          let totalMatches = 0;
          
          // Match full URIs
          for (const match of content.matchAll(fullUriPattern)) {
            totalMatches++;
            const uri = match[1];
            const label = match[2];
            
            console.log(`  → Match ${totalMatches} (full URI): URI=${uri}, Label="${label}"`);
            
            // Filter out non-option URIs (template metadata, common predicates, etc)
            // Keep URIs that look like actual options (typically domain-specific URIs)
            const isMetadata = 
              uri.includes('#assertion') || 
              uri.includes('#Head') ||
              uri.includes('#provenance') ||
              uri.includes('#pubinfo') ||
              uri.includes('ntemplate') ||
              uri.includes('rdf-syntax') || 
              uri.includes('XMLSchema') ||
              uri.includes('rdfs#') ||
              uri.includes('dc/terms') ||
              uri.includes('foaf/0.1') ||
              uri.includes('nanopub/x/') ||
              uri.includes('nanopub.org/nschema') ||
              label.includes('Template:') ||
              label.includes('Making a statement') ||
              label.includes('is a') ||
              label.includes('has type');
            
            if (!isMetadata) {
              placeholder.options.push({
                value: uri,
                label: label
              });
            }
          }
          
          // Match prefixed URIs (sub:something)
          for (const match of content.matchAll(prefixedPattern)) {
            totalMatches++;
            const prefixedUri = match[1]; // e.g., "sub:announcement-intent"
            const label = match[2];
            
            // Expand to full URI
            const localPart = prefixedUri.replace('sub:', '');
            const fullUri = baseUri + localPart;
            
            console.log(`  → Match ${totalMatches} (prefixed): ${prefixedUri} -> ${fullUri}, Label="${label}"`);
            
            // Don't filter these - they're all valid options from the sub: namespace
            placeholder.options.push({
              value: fullUri,
              label: label
            });
          }
          
          console.log(`  → Loaded ${placeholder.options.length} options for ${placeholder.id}`);
          if (placeholder.options.length > 0) {
            console.log(`  → First 3 options:`, placeholder.options.slice(0, 3).map(o => o.label));
          }
        } catch (e) {
          console.warn('Failed to fetch options for', placeholder.id, e);
        }
      }
    }
  }

  parseStatements() {
    const statementIds = this.findStatementIds();
    
    console.log(`Found ${statementIds.length} statement IDs:`, statementIds);
    
    // First, identify grouped statements
    this.parseGroupedStatements();
    
    statementIds.forEach(stmtId => {
      // Skip GroupedStatement definitions (like sub:st06-07)
      if (stmtId.includes('-')) {
        // Check if this is a GroupedStatement marker
        const groupCheck = this.content.match(new RegExp(`${stmtId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+a\\s+nt:GroupedStatement`));
        if (groupCheck) {
          console.log(`Skipping GroupedStatement marker: ${stmtId}`);
          return;
        }
      }
      
      const statement = this.parseStatement(stmtId);
      if (statement) {
        this.template.statements.push(statement);
      }
    });
    
    console.log(`Parsed ${this.template.statements.length} statements`);
  }

  parseGroupedStatements() {
    // Find all GroupedStatement declarations - may have multiple types like "a nt:GroupedStatement, nt:RepeatableStatement"
    const groupRegex = /(sub:st[\w.-]+)\s+a\s+[^;]*nt:GroupedStatement[^;]*;\s*nt:hasStatement\s+([^;.]+)/g;
    let match;
    
    while ((match = groupRegex.exec(this.content)) !== null) {
      const groupId = match[1];
      const statementList = match[2].split(',').map(s => s.trim().replace(/^sub:/, ''));
      
      this.template.groupedStatements.push({
        id: this.cleanUri(groupId),
        statements: statementList
      });
      
      console.log(`Found grouped statement: ${groupId} with statements [${statementList.join(', ')}]`);
    }
  }

  findStatementIds() {
    const ids = new Set();
    
    // From hasStatement lists
    const hasStmtRegex = /nt:hasStatement\s+([^;.]+)/g;
    let match;
    while ((match = hasStmtRegex.exec(this.content)) !== null) {
      const list = match[1].split(',').map(s => s.trim());
      list.forEach(item => {
        if (item.startsWith('sub:st')) ids.add(item);
      });
    }
    
    // Standalone statements - includes hyphens and dots
    const standaloneRegex = /(sub:st[\w.-]+)\s+(?:a\s+nt:|rdf:)/g;
    while ((match = standaloneRegex.exec(this.content)) !== null) {
      ids.add(match[1]);
    }
    
    return Array.from(ids).sort();
  }

  parseStatement(stmtId) {
    const escaped = stmtId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match the statement block - must contain rdf:subject, predicate, or object
    // This avoids matching statement IDs in nt:hasStatement lists
    const blockRegex = new RegExp(
      `${escaped}\\s+(?:a\\s+[^;]+;\\s*)?(rdf:[\\s\\S]*?)(?=\\n\\s*(?:sub:[\\w.-]+|<[^>]+>)\\s+|\\n\\s*}|$)`,
      'i'
    );
    
    const blockMatch = this.content.match(blockRegex);
    if (!blockMatch) {
      console.warn(`Could not find statement block for ${stmtId}`);
      return null;
    }
    
    const block = blockMatch[1];
    
    const subjMatch = block.match(/rdf:subject\s+(<[^>]+>|[\w:-]+)/);
    const predMatch = block.match(/rdf:predicate\s+(<[^>]+>|[\w:-]+)/);
    // Match URIs, references, OR literal strings
    const objMatch = block.match(/rdf:object\s+(?:<([^>]+)>|([\w:-]+)|"([^"]+)")/);
    
    if (!subjMatch || !predMatch || !objMatch) {
      console.warn(`Incomplete statement ${stmtId}:`, { subjMatch: !!subjMatch, predMatch: !!predMatch, objMatch: !!objMatch });
      return null;
    }
    
    // Extract object value from any of the three match groups
    let objectValue;
    if (objMatch[1]) objectValue = objMatch[1];        // URI in brackets
    else if (objMatch[2]) objectValue = objMatch[2];   // Prefixed URI
    else if (objMatch[3]) objectValue = objMatch[3];   // Literal (without quotes)
    
    // Check for types in the full match (before rdf: properties)
    const fullBlock = blockMatch[0];
    const typeMatch = fullBlock.match(/a\s+([^;.]+)/);
    const types = typeMatch ? typeMatch[1].split(',').map(t => t.trim()) : [];
    
    return {
      id: this.cleanUri(stmtId),
      subject: this.cleanUri(subjMatch[1]),
      predicate: this.cleanUri(predMatch[1]),
      object: objectValue,
      isLiteralObject: !!objMatch[3],  // Mark if it's a literal
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
    
    console.log(`Fetching template from ${fetchUrl}`);
    
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
