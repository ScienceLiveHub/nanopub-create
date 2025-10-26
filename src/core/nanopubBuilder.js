/**
 * NanopubBuilder - Builds nanopubs from complete template structure
 * FINAL VERSION - properly handles empty instances and optional fields
 * FIXED: Handles nt:CREATOR placeholder
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
    
    // If subject is a placeholder but not in form data, try to find it
    if (!data.subject && stmt.subjectIsPlaceholder) {
      const subjectId = stmt.subject;
      for (const otherStmt of this.template.statements) {
        if (otherStmt.subjectIsPlaceholder && otherStmt.subject === subjectId) {
          const val = this.formData[`${otherStmt.id}_subject`];
          if (val) {
            data.subject = val;
            break;
          }
        }
        if (otherStmt.objectIsPlaceholder && otherStmt.object === subjectId) {
          const val = this.formData[`${otherStmt.id}_object`];
          if (val) {
            data.subject = val;
            break;
          }
        }
      }
    }
    
    // Check if we have actual data
    const hasSubject = data.subject && data.subject !== '';
    const hasPredicate = data.predicate && data.predicate !== '';
    const hasObject = data.object && data.object !== '';
    
    // For optional statements, skip if no object data
    if (stmt.optional && !hasObject) {
      return null;
    }
    
    // For non-optional, we need data for editable fields
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
      subject = `<${creator}>`;
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
      object = `<${creator}>`;
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
      return `<${creator}>`;
    }
    
    // CRITICAL: If value is just the placeholder name (not actual data), return null
    // This happens when form data is missing for an instance
    const placeholderId = placeholderRef.replace('sub:', '');
    if (value === placeholderId || value === `sub:${placeholderId}`) {
      return null;
    }
    
    // Get placeholder metadata
    const placeholder = this.template.placeholders?.find(p => p.id === placeholderId);
    
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
    
    // Handle literals
    if (value.includes('\n') || value.length > 100) {
      return `"""${value}"""`;
    }
    
    return `"${value}"`;
  }

  formatUri(uri) {
    if (!uri) return null;
    if (uri.includes(':') && !uri.includes('://')) {
      return uri; // Already prefixed
    }
    return `<${uri}>`;
  }

  buildProvenance() {
    const creator = this.metadata.creator || 'https://orcid.org/0000-0000-0000-0000';
    
    return `sub:provenance {
  sub:assertion prov:wasAttributedTo <${creator}> .
}`;
  }

  buildPubinfo(timestamp) {
    const creator = this.metadata.creator || 'https://orcid.org/0000-0000-0000-0000';
    const creatorName = this.metadata.creatorName || 'Unknown';
    
    const lines = [
      `  <${creator}> foaf:name "${creatorName}" .`,
      '',
      `  this: dct:created "${timestamp}"^^xsd:dateTime;`,
      `    dct:creator <${creator}>;`,
      `    dct:license <https://creativecommons.org/licenses/by/4.0/>`
    ];
    
    // Add types
    if (this.template.types?.length > 0) {
      const typesFormatted = this.template.types.map(t => `<${t}>`).join(', ');
      lines.push(`;
    npx:hasNanopubType ${typesFormatted}`);
    }
    
    // Add npx:introduces for introduced resources
    for (const placeholder of this.template.placeholders || []) {
      if (placeholder.isIntroducedResource && placeholder.prefix) {
        const value = this.findPlaceholderValue(placeholder.id);
        if (value) {
          const encoded = encodeURIComponent(value).replace(/%20/g, '+');
          lines.push(`;
    npx:introduces <${placeholder.prefix}${encoded}>`);
        }
      }
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
    for (const stmt of this.template.statements || []) {
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
