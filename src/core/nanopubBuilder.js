/**
 * NanopubBuilder - Builds nanopubs from complete template structure
 * properly handles empty instances and optional fields
 * Handles nt:CREATOR placeholder
 */

export class NanopubBuilder {
  constructor(template) {
    this.template = template;
    console.log('NanopubBuilder initialized with:', {
      uri: template.uri,
      labelPattern: template.labelPattern,
      types: template.types?.length || 0,
      statements: template.statements?.length || 0
    });
  }

  async buildFromFormData(formData, metadata = {}) {
    this.formData = formData;
    this.metadata = metadata;
    
    const timestamp = new Date().toISOString();
    const tempId = this.generateRandomId();
    const baseUri = `http://purl.org/nanopub/temp/${tempId}`;
    
    // Store base URI for IntroducedResource resolution
    this.currentNanopubBaseUri = baseUri;
    
    const prefixes = this.buildPrefixes(tempId);
    const head = this.buildHead();
    const assertion = this.buildAssertion();
    const provenance = this.buildProvenance();
    const pubinfo = this.buildPubinfo(timestamp);
    
    return `${prefixes}

${head}

${assertion}

${provenance}

${pubinfo}
`;
  }

  generateRandomId() {
    return Math.random().toString(36).substring(2, 15);
  }

  buildPrefixes(tempId) {
    const baseUri = `http://purl.org/nanopub/temp/${tempId}`;
    
    const prefixes = [
      `@prefix this: <${baseUri}> .`,
      `@prefix sub: <${baseUri}/> .`,
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
    
    if (this.template.prefixes) {
      for (const [prefix, uri] of Object.entries(this.template.prefixes)) {
        if (!prefixes.some(p => p.includes(`@prefix ${prefix}:`))) {
          prefixes.push(`@prefix ${prefix}: <${uri}> .`);
        }
      }
    }
    
    return prefixes.join('\n');
  }

  buildHead() {
    return `sub:Head {
  this: a np:Nanopublication ;
    np:hasAssertion sub:assertion ;
    np:hasProvenance sub:provenance ;
    np:hasPublicationInfo sub:pubinfo .
}`;
  }

  buildAssertion() {
    const triples = [];
    
    // Sort statements by ID
    const stmtIds = this.template.statements
      .map(s => s.id)
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''));
        const numB = parseInt(b.replace(/\D/g, ''));
        return numA - numB;
      });
    
    for (const stmtId of stmtIds) {
      const stmt = this.template.statements.find(s => s.id === stmtId);
      if (!stmt) continue;
      
      const instances = this.getStatementInstances(stmt);
      
      for (const instance of instances) {
        const triple = this.buildTriple(stmt, instance);
        if (triple) {
          triples.push(triple);
        }
      }
    }
    
    return `sub:assertion {
${triples.join('\n')}
}`;
  }

  /**
   * Get all valid instances of a statement from form data
   */
  getStatementInstances(stmt) {
    const instances = [];
    
    // Check base instance (no suffix)
    const baseInstance = this.getInstanceData(stmt, null);
    if (baseInstance) {
      instances.push(baseInstance);
    }
    
    // Check numbered instances (for repeatable statements)
    if (stmt.repeatable) {
      for (let i = 1; i < 10; i++) {
        const instance = this.getInstanceData(stmt, i);
        if (instance) {
          instances.push(instance);
        } else {
          break; // Stop at first missing instance
        }
      }
    }
    
    return instances;
  }

  /**
   * Get data for one instance - returns null if no valid data
   */
  getInstanceData(stmt, instanceNum) {
    const suffix = instanceNum ? `_${instanceNum}` : '';
    
    // Get form data for this instance
    const data = {
      subject: this.formData[`${stmt.id}_subject${suffix}`],
      predicate: this.formData[`${stmt.id}_predicate${suffix}`],
      object: this.formData[`${stmt.id}_object${suffix}`]
    };
    
    // Check if subject/object are IntroducedResource or LocalResource
    const subjectPlaceholder = this.template.placeholders?.find(p => p.id === stmt.subject);
    const objectPlaceholder = this.template.placeholders?.find(p => p.id === stmt.object);
    
    const subjectIsResource = subjectPlaceholder && 
      (subjectPlaceholder.isIntroducedResource || subjectPlaceholder.isLocalResource);
    const objectIsResource = objectPlaceholder && 
      (objectPlaceholder.isIntroducedResource || objectPlaceholder.isLocalResource);
    
    // If subject is IntroducedResource/LocalResource and we don't have form data for it,
    // look for it in other statements (shared resource across multiple statements)
    if (!data.subject && stmt.subjectIsPlaceholder) {
      const subjectId = stmt.subject;
      const foundValue = this.findPlaceholderValue(subjectId);
      if (foundValue) {
        data.subject = foundValue;
      }
    }
    
    // If object is IntroducedResource/LocalResource and we don't have form data for it,
    // look for it in other statements
    if (!data.object && stmt.objectIsPlaceholder) {
      const objectId = stmt.object;
      const foundValue = this.findPlaceholderValue(objectId);
      if (foundValue) {
        data.object = foundValue;
      }
    }
    
    // Check if we have actual data
    const hasSubject = data.subject && data.subject !== '';
    const hasPredicate = data.predicate && data.predicate !== '';
    const hasObject = data.object && data.object !== '';
    
    // For optional statements, skip if no object data (unless object is a resource type)
    if (stmt.optional && !hasObject && !objectIsResource) {
      return null;
    }
    
    // For non-optional statements:
    // - If both subject and object placeholders are empty, skip
    // - Otherwise, proceed
    if (!stmt.optional) {
      if (stmt.objectIsPlaceholder && !hasObject) {
        return null;
      }
      if (stmt.predicateIsPlaceholder && !hasPredicate) {
        return null;
      }
    }
    
    return data;
  }

  /**
   * Build a single RDF triple
   */
  buildTriple(stmt, instanceData) {
    const creator = this.metadata.creator || 'https://orcid.org/0000-0000-0000-0000';
    
    // Get subject - check if it's the special nt:CREATOR marker
    let subjectValue = instanceData.subject || stmt.subject;
    let subject;
    
    if (stmt.subjectUri === 'nt:CREATOR') {
      subject = creator.startsWith('orcid:') ? creator : `orcid:${creator.split('/').pop()}`;
    } else {
      subject = stmt.subjectIsPlaceholder
        ? this.resolveValue(subjectValue, stmt.subject)
        : this.formatUri(stmt.subjectUri);
    }
    
    // Get predicate
    const predicateValue = instanceData.predicate || stmt.predicate;
    const predicate = stmt.predicateIsPlaceholder
      ? this.resolveValue(predicateValue, stmt.predicate)
      : this.formatUri(stmt.predicateUri);
    
    // Get object - check if it's the special nt:CREATOR marker
    let objectValue = instanceData.object || stmt.object;
    let object;
    
    if (stmt.objectUri === 'nt:CREATOR') {
      object = creator.startsWith('orcid:') ? creator : `orcid:${creator.split('/').pop()}`;
    } else {
      object = stmt.objectIsPlaceholder
        ? this.resolveValue(objectValue, stmt.object)
        : this.formatUri(stmt.objectUri);
    }
    
    // Skip if any part is missing or is just a placeholder name
    if (!subject || !predicate || !object) {
      return null;
    }
    
    // Skip if any part is still an unresolved placeholder reference
    if (subject.startsWith('<') && subject.endsWith('>') && !subject.includes('://')) {
      return null;
    }
    if (object.startsWith('<') && object.endsWith('>') && !object.includes('://')) {
      return null;
    }
    
    // Format based on whether it's a type declaration
    const isTypeDeclaration = stmt.predicateUri === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' ||
                              predicate === 'rdf:type' ||
                              predicate === 'a';
    
    if (isTypeDeclaration) {
      return `  ${subject} a ${object} .`;
    }
    
    return `  ${subject} ${predicate} ${object} .`;
  }

  /**
   * Resolve a placeholder value to RDF format
   */
  resolveValue(value, placeholderRef) {
    if (!value || value === '') return null;
    
    // CRITICAL FIX: Handle nt:CREATOR special placeholder
    if (value === 'nt:CREATOR' || value === 'CREATOR' || 
        placeholderRef === 'nt:CREATOR' || placeholderRef === 'CREATOR') {
      const creator = this.metadata.creator || 'https://orcid.org/0000-0000-0000-0000';
      return creator.startsWith('orcid:') ? creator : `orcid:${creator.split('/').pop()}`;
    }
    
    // CRITICAL: If value is just the placeholder name (not actual data), return null
    // This happens when form data is missing for an instance
    const placeholderId = placeholderRef.replace('sub:', '');
    if (value === placeholderId || value === `sub:${placeholderId}`) {
      return null;
    }
    
    // Get placeholder metadata
    const placeholder = this.template.placeholders?.find(p => p.id === placeholderId);
    
    // Handle IntroducedResource/LocalResource - these create new URIs based on current nanopub
    if (placeholder && (placeholder.isIntroducedResource || placeholder.isLocalResource)) {
      // Use the current nanopub's base URI + the user's input as suffix
      const baseUri = this.currentNanopubBaseUri || 'http://purl.org/nanopub/temp/unknown';
      return `<${baseUri}/${value}>`;
    }
    
    // Handle AutoEscapeUriPlaceholder
    if (placeholder?.type === 'AutoEscapeUriPlaceholder' && placeholder.prefix) {
      const encoded = encodeURIComponent(value).replace(/%20/g, '+');
      return `<${placeholder.prefix}${encoded}>`;
    }
    
    // Handle URI placeholders
    if (placeholder?.type === 'UriPlaceholder' || 
        placeholder?.type === 'GuidedChoicePlaceholder' ||
        placeholder?.type === 'ExternalUriPlaceholder' ||
        value.startsWith('http://') || 
        value.startsWith('https://')) {
      return `<${value}>`;
    }
    
    // Handle literals with datatype
    if (placeholder?.hasDatatype) {
      // For typed literals, don't escape quotes (WKT, dates, etc. don't contain quotes)
      return `"${value}"^^<${placeholder.hasDatatype}>`;
    }
    
    // Handle regular literals - escape properly for TriG/Turtle
    // Use triple quotes for multi-line text, single quotes otherwise
    const hasNewlines = value.includes('\n');
    
    if (hasNewlines) {
      // Use triple quotes for multi-line text
      // In triple-quoted strings, only """ needs escaping
      let escaped = value.replace(/"""/g, '\\"""');
      
      // CRITICAL: Prevent collision with closing """
      // If text ends with one or two quotes, they'll merge with closing """
      if (escaped.endsWith('""')) {
        escaped = escaped.slice(0, -2) + '\\"\\""';  // Escape the last two
      } else if (escaped.endsWith('"')) {
        escaped = escaped.slice(0, -1) + '\\"';  // Escape the last one
      }
      
      return `"""${escaped}"""`;
    } else {
      // Single-line text: use single quotes with escaped quotes
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return `"${escaped}"`;
    }
  }

  formatUri(uri) {
    if (!uri) return null;
    if (uri.includes(':') && !uri.includes('://')) {
      return uri; // Already prefixed
    }
    return `<${uri}>`;
  }

  buildProvenance() {
    const creator = this.metadata.creator || 'https://orcid.org/0000-0002-1784-2920';
    const creatorRef = creator.startsWith('orcid:') ? creator : `orcid:${creator.split('/').pop()}`;
    
    return `sub:provenance {
  sub:assertion prov:wasAttributedTo ${creatorRef} .
}`;
  }

  buildPubinfo(timestamp) {
    const creator = this.metadata.creator || 'https://orcid.org/0000-0002-1784-2920';
    const creatorName = this.metadata.creatorName || 'Unknown';
    const creatorRef = creator.startsWith('orcid:') ? creator : `orcid:${creator.split('/').pop()}`;
    
    const lines = [
      `  ${creatorRef} foaf:name "${creatorName}" .`,
      '',
      `  this: dct:created "${timestamp}"^^xsd:dateTime;`,
      `    dct:creator ${creatorRef};`,
      `    dct:license <https://creativecommons.org/licenses/by/4.0/>`
    ];
    
    // Add types
    if (this.template.types?.length > 0) {
      const typesFormatted = this.template.types.map(t => `<${t}>`).join(', ');
      lines.push(`;
    npx:hasNanopubType ${typesFormatted}`);
    }
    
    // Add npx:introduces for introduced resources
    const introducedUris = [];
    for (const placeholder of this.template.placeholders || []) {
      if (placeholder.isIntroducedResource) {
        const value = this.findPlaceholderValue(placeholder.id);
        if (value) {
          const uri = `${this.currentNanopubBaseUri}/${value}`;
          introducedUris.push(`<${uri}>`);
        }
      }
    }
    
    if (introducedUris.length > 0) {
      lines.push(`;
    npx:introduces ${introducedUris.join(', ')}`);
    }
    
    // Add label
    if (this.template.labelPattern) {
      const label = this.generateLabel();
      lines.push(`;
    rdfs:label "${label}"`);
    }
    
    // Add template URI
    if (this.template.uri) {
      lines.push(`;
    nt:wasCreatedFromTemplate <${this.template.uri}>`);
    }
    
    lines.push(' .');
    
    return `sub:pubinfo {
${lines.join('\n')}
}`;
  }

  /**
   * Find value for a placeholder in form data
   */
  findPlaceholderValue(placeholderId) {
    // Check all statements for this placeholder in either subject or object position
    for (const stmt of this.template.statements || []) {
      // Check if placeholder is the subject
      if (stmt.subject === placeholderId || stmt.subject === `sub:${placeholderId}`) {
        const value = this.formData[`${stmt.id}_subject`];
        if (value) return value;
        
        if (stmt.repeatable) {
          for (let i = 1; i < 10; i++) {
            const val = this.formData[`${stmt.id}_subject_${i}`];
            if (val) return val;
          }
        }
      }
      
      // Check if placeholder is the object
      if (stmt.object === placeholderId || stmt.object === `sub:${placeholderId}`) {
        const value = this.formData[`${stmt.id}_object`];
        if (value) return value;
        
        if (stmt.repeatable) {
          for (let i = 1; i < 10; i++) {
            const val = this.formData[`${stmt.id}_object_${i}`];
            if (val) return val;
          }
        }
      }
    }
    return null;
  }

  /**
   * Generate label from pattern
   */
  generateLabel() {
    let label = this.template.labelPattern || 'Untitled';
    
    const matches = [...label.matchAll(/\$\{(\w+)\}/g)];
    
    for (const match of matches) {
      const placeholderId = match[1];
      const value = this.findPlaceholderValue(placeholderId);
      
      if (value) {
        label = label.replace(match[0], value);
      } else {
        label = label.replace(match[0], '');
      }
    }
    
    return label.trim();
  }
}
