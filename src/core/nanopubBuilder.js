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
    console.log('Types:', this.template.types);
  }

  /**
   * Build nanopublication from form data
   */
  async buildFromFormData(formData, metadata = {}) {
    this.formData = formData; // Store for use in label pattern
    
    const timestamp = new Date().toISOString();
    const tempId = `temp-${Date.now()}-${this.generateRandomId()}`;
    const baseUri = `https://w3id.org/np/${tempId}`;
    
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
    const baseUri = `https://w3id.org/np/${tempId}`;
    
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
   * Build assertion graph from form data and template statements
   */
  buildAssertion(baseUri, formData, tempId) {
    const statements = [];
    
    if (!this.template.statements || this.template.statements.length === 0) {
      return `sub:assertion {
  # No statements defined in template
}`;
    }
    
    console.log('Building assertion with formData:', formData);
    console.log('Template statements:', this.template.statements);
    
    // Debug: Show what each statement looks like
    this.template.statements.forEach((stmt, i) => {
      console.log(`Statement ${i}:`, {
        id: stmt.id,
        subject: stmt.subject,
        predicate: stmt.predicate,
        object: stmt.object
      });
    });
    
    // Group statements by subject for compact output
    const grouped = {};
    
    for (const statement of this.template.statements) {
      const subject = this.resolveValue(statement.subject, formData, 'subject');
      const predicate = this.resolveValue(statement.predicate, formData, 'predicate');
      const object = this.resolveValue(statement.object, formData, 'object');
      
      if (!subject || !predicate || !object) {
        console.warn('Incomplete triple:', statement);
        continue;
      }
      
      // Use 'a' shorthand for rdf:type
      const compactPredicate = predicate === 'rdf:type' ? 'a' : predicate;
      
      if (!grouped[subject]) {
        grouped[subject] = [];
      }
      grouped[subject].push({ predicate: compactPredicate, object });
    }
    
    // Build compact output
    const output = [];
    for (const [subject, predicates] of Object.entries(grouped)) {
      if (predicates.length === 1) {
        // Single predicate - simple format
        output.push(`  ${subject} ${predicates[0].predicate} ${predicates[0].object} .`);
      } else {
        // Multiple predicates - use semicolon grouping
        output.push(`  ${subject} ${predicates[0].predicate} ${predicates[0].object};`);
        for (let i = 1; i < predicates.length - 1; i++) {
          output.push(`    ${predicates[i].predicate} ${predicates[i].object};`);
        }
        output.push(`    ${predicates[predicates.length - 1].predicate} ${predicates[predicates.length - 1].object} .`);
      }
    }
    
    if (output.length === 0) {
      return `sub:assertion {
  # No data provided
}`;
    }
    
    return `sub:assertion {
${output.join('\n')}
}`;
  }

  /**
   * Build a triple from statement and form data
   */
  buildTriple(statement, formData) {
    console.log(`\nBuilding triple for statement ${statement.id}:`);
    
    const subject = this.resolveValue(statement.subject, formData, 'subject');
    console.log(`  subject: ${statement.subject} → ${subject}`);
    
    const predicate = this.resolveValue(statement.predicate, formData, 'predicate');
    console.log(`  predicate: ${statement.predicate} → ${predicate}`);
    
    const object = this.resolveValue(statement.object, formData, 'object');
    console.log(`  object: ${statement.object} → ${object}`);
    
    if (!subject || !predicate || !object) {
      console.warn('Incomplete triple:', statement);
      return null;
    }
    
    const triple = `${subject} ${predicate} ${object}`;
    console.log(`  → Triple: ${triple}`);
    return triple;
  }

  /**
   * Resolve a value - either from form data (placeholder) or as literal
   */
  resolveValue(value, formData, role = null) {
    if (!value) return null;
    
    console.log(`    [resolveValue] value="${value}", role="${role}"`);
    
    // Check if it's a placeholder reference (like sub:article, sub:cited, sub:cites)
    const cleanValue = value.replace(/^sub:/, '');
    console.log(`    [resolveValue] cleanValue="${cleanValue}"`);
    
    // Direct lookup in form data
    if (formData[cleanValue]) {
      console.log(`    [resolveValue] Found direct match in formData!`);
      return this.formatValue(formData[cleanValue]);
    }
    
    // Check if it's used in any statement (st01_subject, st02_object, etc.)
    // Form data structure is like: { st02_subject: "...", st02_predicate: "...", st02_object: "..." }
    console.log(`    [resolveValue] Checking statement-based keys...`);
    for (const [key, val] of Object.entries(formData)) {
      console.log(`      Checking key: ${key}`);
      // Extract statement parts (e.g., "st02_subject" -> "subject")
      const parts = key.split('_');
      if (parts.length === 2) {
        const [stmtId, keyRole] = parts;
        console.log(`        Statement ID: ${stmtId}, Role: ${keyRole}`);
        
        // Find the template statement - try both with and without sub: prefix
        let statement = this.template.statements?.find(s => s.id === `sub:${stmtId}`);
        if (!statement) {
          statement = this.template.statements?.find(s => s.id === stmtId);
        }
        
        if (statement) {
          console.log(`        Found statement:`, statement);
          
          // Check if this placeholder matches the statement role
          // Both "article" and "sub:article" should match
          const stmtSubject = statement.subject?.replace(/^sub:/, '');
          const stmtPredicate = statement.predicate?.replace(/^sub:/, '');
          const stmtObject = statement.object?.replace(/^sub:/, '');
          
          console.log(`        Comparing: cleanValue="${cleanValue}" with role="${keyRole}"`);
          console.log(`          statement.subject="${stmtSubject}" (orig: ${statement.subject})`);
          console.log(`          statement.predicate="${stmtPredicate}" (orig: ${statement.predicate})`);
          console.log(`          statement.object="${stmtObject}" (orig: ${statement.object})`);
          
          // Check if this value matches the role in the statement
          if (keyRole === 'subject' && stmtSubject === cleanValue) {
            console.log(`        ✓ Match! subject matches`);
            return this.formatValue(val);
          } else if (keyRole === 'predicate' && stmtPredicate === cleanValue) {
            console.log(`        ✓ Match! predicate matches`);
            return this.formatValue(val);
          } else if (keyRole === 'object' && stmtObject === cleanValue) {
            console.log(`        ✓ Match! object matches`);
            return this.formatValue(val);
          }
        } else {
          console.log(`        Statement not found for ID: ${stmtId}`);
        }
      }
    }
    
    // Check if it's a placeholder in template
    const placeholder = this.template.placeholders?.find(p => p.id === cleanValue);
    if (placeholder && formData[placeholder.id]) {
      console.log(`    [resolveValue] Found placeholder match!`);
      return this.formatValue(formData[placeholder.id]);
    }
    
    // It's a fixed value - return as is (adding angle brackets if it's a URI)
    console.log(`    [resolveValue] Using as fixed value`);
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return `<${value}>`;
    }
    
    // If it has a colon, it's a prefixed name
    if (value.includes(':')) {
      return value;
    }
    
    // Otherwise return with angle brackets
    return `<${value}>`;
  }

  /**
   * Format a value based on its type
   */
  formatValue(value) {
    if (!value) return '""';
    
    // If it's already formatted (starts with < or "), return as is
    if (value.startsWith('<') || value.startsWith('"')) {
      return value;
    }
    
    // If it looks like a URI
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return `<${value}>`;
    }
    
    // If it has a colon and looks like a prefixed name
    if (value.includes(':') && !value.includes(' ')) {
      return value;
    }
    
    // Otherwise it's a string literal
    return `"${value}"`;
  }

  /**
   * Build provenance graph
   */
  buildProvenance(baseUri, formData, metadata) {
    const creator = metadata.creator || 'orcid:0000-0000-0000-0000';
    
    // Use ORCID without full URL if it's already a full URL
    const creatorRef = creator.startsWith('https://orcid.org/') 
      ? 'orcid:' + creator.split('/').pop()
      : creator;
    
    return `sub:provenance {
  sub:assertion prov:wasAttributedTo ${creatorRef} .
}`;
  }

  /**
   * Build publication info graph
   */
  buildPubinfo(baseUri, timestamp, metadata) {
    const creator = metadata.creator || 'orcid:0000-0000-0000-0000';
    const creatorName = metadata.creatorName || 'Unknown';
    
    // Use ORCID without full URL if it's already a full URL
    const creatorRef = creator.startsWith('https://orcid.org/') 
      ? 'orcid:' + creator.split('/').pop()
      : creator;
    
    const statements = [];
    
    // Creator name
    statements.push(`  ${creatorRef} foaf:name "${creatorName}" .`);
    statements.push('');
    
    // Generate dynamic label from template pattern if available
    let label = this.template.label || 'Nanopublication';
    if (this.template.labelPattern) {
      console.log('Applying label pattern:', this.template.labelPattern);
      console.log('Form data for pattern:', this.formData);
      
      // Replace ${placeholder} with actual values from form data
      label = this.template.labelPattern.replace(/\$\{(\w+)\}/g, (match, placeholder) => {
        console.log(`Looking for placeholder: ${placeholder}`);
        
        // Try direct lookup first
        let value = this.formData?.[placeholder];
        
        // If not found, look in statement-based keys (e.g., st02_subject for "article")
        if (!value) {
          // Find which statement uses this placeholder
          for (const stmt of this.template.statements || []) {
            const stmtSubject = stmt.subject?.replace(/^sub:/, '');
            const stmtPredicate = stmt.predicate?.replace(/^sub:/, '');
            const stmtObject = stmt.object?.replace(/^sub:/, '');
            
            const stmtId = stmt.id?.replace(/^sub:/, '');
            
            if (stmtSubject === placeholder && this.formData[`${stmtId}_subject`]) {
              value = this.formData[`${stmtId}_subject`];
              console.log(`Found ${placeholder} in ${stmtId}_subject:`, value);
              break;
            } else if (stmtPredicate === placeholder && this.formData[`${stmtId}_predicate`]) {
              value = this.formData[`${stmtId}_predicate`];
              console.log(`Found ${placeholder} in ${stmtId}_predicate:`, value);
              break;
            } else if (stmtObject === placeholder && this.formData[`${stmtId}_object`]) {
              value = this.formData[`${stmtId}_object`];
              console.log(`Found ${placeholder} in ${stmtId}_object:`, value);
              break;
            }
          }
        }
        
        if (value) {
          // Extract DOI number from URL if it's a DOI
          if (value.includes('doi.org/')) {
            const extracted = value.split('doi.org/')[1];
            console.log(`Extracted DOI: ${extracted}`);
            return extracted;
          }
          return value;
        }
        console.log(`Placeholder ${placeholder} not found, keeping as is`);
        return match;
      });
      
      console.log('Final label:', label);
    }
    
    // Basic metadata with template reference
    statements.push(`  this: dct:created "${timestamp}"^^xsd:dateTime;`);
    statements.push(`    dct:creator ${creatorRef};`);
    statements.push(`    dct:license <https://creativecommons.org/licenses/by/4.0/>;`);
    
    // Nanopub types from template - IMPORTANT!
    if (this.template.types && this.template.types.length > 0) {
      const types = this.template.types.map(t => `<${t}>`).join(', ');
      statements.push(`    npx:hasNanopubType ${types};`);
    }
    
    // Optional: wasCreatedAt (your platform URL)
    if (metadata.createdAt) {
      statements.push(`    npx:wasCreatedAt <${metadata.createdAt}>;`);
    }
    
    // Label (dynamic or from template)
    statements.push(`    rdfs:label "${label}";`);
    
    // Template reference - CRITICAL for nanodash compatibility
    if (this.templateUri) {
      statements.push(`    nt:wasCreatedFromTemplate <${this.templateUri}> .`);
    } else {
      // Remove trailing semicolon if no template URI
      const lastIdx = statements.length - 1;
      statements[lastIdx] = statements[lastIdx].replace(/;$/, ' .');
    }
    
    return `sub:pubinfo {
${statements.join('\n')}
}`;
  }
}
