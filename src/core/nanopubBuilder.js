/**
 * NanopubBuilder - Builds nanopublications from templates and form data
 * Following the nanodash approach to generate proper TriG format
 */

export class NanopubBuilder {
  constructor(template) {
    this.template = template;
    // Try to get URI from template - could be in uri, id, or templateUri field
    this.templateUri = template.uri || template.id || template.templateUri || null;
    
    // Extract label pattern if present (might be in different places)
    this.template.labelPattern = template.labelPattern || template.nanopubLabelPattern || null;
    
    // Extract types if present
    this.template.types = template.types || template.nanopubTypes || [];
    
    console.log('NanopubBuilder initialized with template URI:', this.templateUri);
    console.log('Label pattern:', this.template.labelPattern);
    console.log('Types from template:', this.template.types);
    console.log('Types array length:', this.template.types?.length || 0);
  }

  /**
   * Build nanopublication from form data
   */
  async buildFromFormData(formData, metadata = {}) {
    this.formData = formData; // Store for use in label pattern
    this.metadata = metadata; // Store for use in resolveValue
    
    const timestamp = new Date().toISOString();
    // IMPORTANT: Use the exact temp URI format that nanopub-rs expects
    // This MUST be "http://purl.org/nanopub/temp/" not "https://w3id.org/np/temp-..."
    const tempId = this.generateRandomId();
    const baseUri = `http://purl.org/nanopub/temp/${tempId}`;
    
    // Build the nanopub structure
    const prefixes = this.buildPrefixes(tempId);
    const head = this.buildHead(baseUri, tempId);
    const assertion = this.buildAssertion(baseUri, formData, tempId);
    const provenance = this.buildProvenance(baseUri, formData, metadata);
    const pubinfo = this.buildPubinfo(baseUri, timestamp, metadata);
    
    // Combine into TriG format
    const trig = `${prefixes}

${head}

${assertion}

${provenance}

${pubinfo}
`;
    
    return trig;
  }

  /**
   * Generate random ID for temporary nanopub URI
   */
  generateRandomId() {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Build prefix declarations
   */
  buildPrefixes(tempId) {
    const baseUri = `http://purl.org/nanopub/temp/${tempId}`;
    
    const prefixes = [
      `@prefix this: <${baseUri}> .`,
      `@prefix sub: <${baseUri}#> .`,
      '@prefix np: <http://www.nanopub.org/nschema#> .',
      '@prefix dct: <http://purl.org/dc/terms/> .',
      '@prefix nt: <https://w3id.org/np/o/ntemplate/> .',
      '@prefix npx: <http://purl.org/nanopub/x/> .',
      '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
      '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
      '@prefix orcid: <https://orcid.org/> .',
      '@prefix prov: <http://www.w3.org/ns/prov#> .',
      '@prefix foaf: <http://xmlns.com/foaf/0.1/> .',
      '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .'
    ];
    
    // Add template-specific prefixes
    if (this.template.prefixes) {
      for (const [prefix, uri] of Object.entries(this.template.prefixes)) {
        if (!prefixes.some(p => p.includes(`@prefix ${prefix}:`))) {
          prefixes.push(`@prefix ${prefix}: <${uri}> .`);
        }
      }
    }
    
    return prefixes.join('\n');
  }

  /**
   * Build head graph
   */
  buildHead(baseUri, tempId) {
    return `sub:Head {
  this: a np:Nanopublication ;
    np:hasAssertion sub:assertion ;
    np:hasProvenance sub:provenance ;
    np:hasPublicationInfo sub:pubinfo .
}`;
  }

  /**
   * Build assertion graph from form data
   */
  buildAssertion(baseUri, formData, tempId) {
    const statements = this.buildStatements(formData);
    
    return `sub:assertion {
${statements.join('\n')}
}`;
  }

  /**
   * Build individual RDF statements from form data
   */
  buildStatements(formData) {
    const statements = [];
    
    // Group form data by statement prefix (st01, st02, etc.)
    const statementsData = {};
    for (const [key, value] of Object.entries(formData)) {
      if (!value) continue; // Skip empty values
      
      // Extract statement ID and part (st01_subject, st01_predicate, etc.)
      const match = key.match(/^(st\d+)_(subject|predicate|object)$/);
      if (match) {
        const [, stId, part] = match;
        if (!statementsData[stId]) {
          statementsData[stId] = {};
        }
        statementsData[stId][part] = value;
      }
    }
    
    // Build each statement
    for (const [stId, parts] of Object.entries(statementsData)) {
      if (parts.subject && parts.predicate && parts.object) {
        const subject = this.formatValue(parts.subject, 'subject');
        const predicate = this.formatValue(parts.predicate, 'predicate');
        const object = this.formatValue(parts.object, 'object');
        
        // Check if this statement has a type (from template)
        const hasType = this.hasStatementType(stId);
        
        if (hasType) {
          // Multi-line format with type
          statements.push(`  ${subject} a ${hasType};`);
          statements.push(`    ${predicate} ${object} .`);
        } else {
          // Single-line format
          statements.push(`  ${subject} ${predicate} ${object} .`);
        }
      }
    }
    
    return statements;
  }

  /**
   * Check if a statement has a type declaration in the template
   */
  hasStatementType(stId) {
    if (!this.template.statements) return null;
    
    const statement = this.template.statements.find(st => st.id === stId);
    if (!statement || !statement.subjectType) return null;
    
    return this.formatValue(statement.subjectType, 'type');
  }

  /**
   * Format a value for RDF (URI or literal)
   */
  formatValue(value, position = 'any') {
    if (!value) return '""';
    
    // Check if it's a URI (starts with http:// or https://)
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return `<${value}>`;
    }
    
    // Check if it's a prefixed name (contains : but not http://)
    if (value.includes(':') && !value.includes('://')) {
      return value; // Already prefixed
    }
    
    // Check if value is a URI in angle brackets already
    if (value.startsWith('<') && value.endsWith('>')) {
      return value;
    }
    
    // For objects, check if it should be a literal with triple quotes
    if (position === 'object' && (value.includes('\n') || value.length > 100)) {
      return `"""${value}"""`;
    }
    
    // Otherwise, it's a literal string
    return `"${value}"`;
  }

  /**
   * Build provenance graph
   */
  buildProvenance(baseUri, formData, metadata) {
    const creator = metadata.creator || 'https://orcid.org/0000-0000-0000-0000';
    
    return `sub:provenance {
  sub:assertion prov:wasAttributedTo ${this.formatValue(creator)} .
}`;
  }

  /**
   * Build publication info graph
   */
  buildPubinfo(baseUri, timestamp, metadata) {
    const creator = metadata.creator || 'https://orcid.org/0000-0000-0000-0000';
    const creatorName = metadata.creatorName || 'Unknown';
    
    const statements = [
      `  ${this.formatValue(creator)} foaf:name "${creatorName}" .`,
      '',
      `  this: dct:created "${timestamp}"^^xsd:dateTime;`,
      `    dct:creator ${this.formatValue(creator)};`,
      `    dct:license <https://creativecommons.org/licenses/by/4.0/>`
    ];
    
    // Add nanopub types if present in template
    if (this.template.types && this.template.types.length > 0) {
      console.log('📝 Adding types to pubinfo:', this.template.types);
      const typesFormatted = this.template.types.map(t => `<${t}>`).join(', ');
      console.log('  ✅ Types formatted:', typesFormatted);
      statements.push(`;
    npx:hasNanopubType ${typesFormatted}`);
    }
    
    // Add label if label pattern exists
    if (this.template.labelPattern) {
      const label = this.generateLabel();
      statements.push(`;
    rdfs:label "${label}"`);
    }
    
    // Add template URI if present
    if (this.templateUri) {
      statements.push(`;
    nt:wasCreatedFromTemplate <${this.templateUri}>`);
    }
    
    statements.push(' .');
    
    return `sub:pubinfo {
${statements.join('\n')}
}`;
  }

  /**
   * Generate label from pattern by replacing placeholders with form data
   */
  generateLabel() {
    if (!this.template.labelPattern) return 'Untitled';
    
    let label = this.template.labelPattern;
    console.log('Applying label pattern:', label);
    console.log('Form data for pattern:', this.formData);
    
    // Find all ${placeholder} patterns
    const placeholderRegex = /\$\{(\w+)\}/g;
    const matches = [...label.matchAll(placeholderRegex)];
    
    for (const match of matches) {
      const placeholderName = match[1];
      console.log(`  🔍 Looking for placeholder: "${placeholderName}"`);
      
      // Try to find value in formData
      let value = null;
      
      // First try direct lookup
      if (this.formData[placeholderName]) {
        value = this.formData[placeholderName];
        console.log(`    Direct lookup formData["${placeholderName}"]:`, value);
      }
      
      // If not found, look in statement parts (st01_subject, st02_object, etc.)
      if (!value) {
        for (const [key, val] of Object.entries(this.formData)) {
          console.log(`    Checking formData["${key}"] = ${val}`);
          
          // Check if this key is a statement part
          const stMatch = key.match(/^(st\d+)_(subject|predicate|object)$/);
          if (stMatch) {
            const [, stId, part] = stMatch;
            console.log(`      Statement ${stId} ${part} = "${placeholderName}"`);
            
            // Look up what this part refers to in the template
            const statement = this.template.statements?.find(st => st.id === stId);
            if (statement) {
              // Check if this part matches our placeholder
              if (statement[part] === placeholderName || statement[part] === `sub:${placeholderName}`) {
                value = val;
                console.log(`    ✅ Found ${placeholderName} in ${key}:`, value);
                break;
              }
            }
          }
        }
      }
      
      if (value) {
        // Extract a readable label from the value
        let displayValue = value;
        
        // If it's a URI, try to extract a meaningful part
        if (value.startsWith('http://') || value.startsWith('https://')) {
          // Try to get the last part of the URI
          const uriParts = value.split('/');
          const lastPart = uriParts[uriParts.length - 1];
          
          // If last part looks like an ID or has useful info, use it
          if (lastPart && lastPart.length > 0) {
            displayValue = lastPart;
            console.log(`    📝 Extracted from URI: "${displayValue}"`);
          }
        }
        
        label = label.replace(match[0], displayValue);
      }
    }
    
    console.log('🏷️ Final label after pattern replacement:', label);
    return label;
  }
}
