/**
 * Nanopub Builder
 * 
 * Converts form data into valid TriG format nanopublications
 */

export class NanopubBuilder {
  constructor(template) {
    this.template = template;
  }

  /**
   * Build a nanopublication from form data
   */
  buildFromFormData(formData, metadata = {}) {
    // Generate unique nanopub URI
    const nanopubUri = this.generateNanopubUri();
    
    // Build all graph components
    const assertions = this.buildAssertions(formData);
    const provenance = this.buildProvenance(metadata);
    const pubinfo = this.buildPubinfo(metadata, nanopubUri);
    
    // Combine into complete TriG document
    return this.buildTriG(nanopubUri, assertions, provenance, pubinfo);
  }

  /**
   * Generate unique nanopub URI
   */
  generateNanopubUri() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `https://w3id.org/np/temp-${timestamp}-${random}`;
  }

  /**
   * Build assertion statements from form data
   */
  buildAssertions(formData) {
    const assertions = [];
    
    for (const statement of this.template.statements) {
      const subject = this.resolveValue(statement.subject, formData);
      const predicate = this.resolveValue(statement.predicate, formData);
      const objectValue = this.resolveValue(statement.object, formData);
      
      // Handle repeatable statements (arrays)
      if (statement.repeatable && Array.isArray(formData[statement.object.replace('sub:', '')])) {
        const values = formData[statement.object.replace('sub:', '')];
        values.forEach(value => {
          if (value && value.trim()) {
            assertions.push({
              subject: subject,
              predicate: predicate,
              object: this.formatValue(value)
            });
          }
        });
      } else {
        const finalObject = this.formatValue(objectValue);
        if (finalObject && finalObject !== '""') {
          assertions.push({ subject, predicate, object: finalObject });
        }
      }
    }
    
    return assertions;
  }

  /**
   * Resolve placeholder or URI value
   */
  resolveValue(value, formData) {
    if (!value) return '';
    
    // If it's a placeholder (sub:something), get from form data
    if (value.startsWith('sub:')) {
      const placeholderId = value.replace('sub:', '');
      return formData[placeholderId] || value;
    }
    
    // Otherwise return as-is (it's a URI or literal)
    return value;
  }

  /**
   * Format value as RDF literal or URI
   */
  formatValue(value) {
    if (!value) return '';
    
    const stringValue = String(value);
    
    // If it's already formatted, return as-is
    if (stringValue.startsWith('<') && stringValue.endsWith('>')) {
      return stringValue;
    }
    if (stringValue.startsWith('"') && stringValue.endsWith('"')) {
      return stringValue;
    }
    
    // If it looks like a URI, format as URI
    if (stringValue.startsWith('http://') || stringValue.startsWith('https://')) {
      return `<${stringValue}>`;
    }
    
    // Otherwise format as literal
    const escaped = stringValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `"${escaped}"`;
  }

  /**
   * Build provenance graph
   */
  buildProvenance(metadata) {
    const provenance = [];
    
    if (metadata.creatorOrcid) {
      provenance.push({
        subject: 'sub:assertion',
        predicate: 'prov:wasAttributedTo',
        object: `<${metadata.creatorOrcid}>`
      });
    }
    
    if (metadata.createdAt) {
      provenance.push({
        subject: 'sub:assertion',
        predicate: 'prov:generatedAtTime',
        object: `"${metadata.createdAt}"^^xsd:dateTime`
      });
    }
    
    return provenance;
  }

  /**
   * Build publication info graph
   */
  buildPubinfo(metadata, nanopubUri) {
    const pubinfo = [];
    const now = new Date().toISOString();
    
    // Creation date
    pubinfo.push({
      subject: 'this:',
      predicate: 'dct:created',
      object: `"${now}"^^xsd:dateTime`
    });
    
    // Creator
    if (metadata.creatorOrcid) {
      pubinfo.push({
        subject: 'this:',
        predicate: 'dct:creator',
        object: `<${metadata.creatorOrcid}>`
      });
      
      // Creator name
      if (metadata.creatorName) {
        pubinfo.push({
          subject: `<${metadata.creatorOrcid}>`,
          predicate: 'foaf:name',
          object: `"${metadata.creatorName}"`
        });
      }
    }
    
    // License
    pubinfo.push({
      subject: 'this:',
      predicate: 'dct:license',
      object: '<https://creativecommons.org/licenses/by/4.0/>'
    });
    
    // Template reference
    if (this.template.uri) {
      pubinfo.push({
        subject: 'this:',
        predicate: 'nt:wasCreatedFromTemplate',
        object: `<${this.template.uri}>`
      });
    }
    
    return pubinfo;
  }

  /**
   * Build complete TriG document
   */
  buildTriG(nanopubUri, assertions, provenance, pubinfo) {
    const prefixes = this.serializePrefixes();
    const head = this.serializeHead(nanopubUri);
    const assertionGraph = this.serializeGraph(assertions);
    const provenanceGraph = this.serializeGraph(provenance);
    const pubinfoGraph = this.serializeGraph(pubinfo);
    
    return `${prefixes}

${head}

<${nanopubUri}#assertion> {
${assertionGraph}
}

<${nanopubUri}#provenance> {
${provenanceGraph}
}

<${nanopubUri}#pubinfo> {
${pubinfoGraph}
}
`.trim();
  }

  /**
   * Serialize prefixes
   */
  serializePrefixes() {
    const standardPrefixes = {
      'this': '',  // Will be set dynamically
      'sub': '',   // Will be set dynamically
      'np': 'http://www.nanopub.org/nschema#',
      'dct': 'http://purl.org/dc/terms/',
      'prov': 'http://www.w3.org/ns/prov#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#',
      'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
      'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      'foaf': 'http://xmlns.com/foaf/0.1/',
      'nt': 'https://w3id.org/np/o/ntemplate/'
    };
    
    // Merge template prefixes with standard ones
    const allPrefixes = { ...standardPrefixes, ...this.template.prefixes };
    
    return Object.entries(allPrefixes)
      .filter(([prefix, uri]) => uri) // Skip empty URIs
      .map(([prefix, uri]) => `@prefix ${prefix}: <${uri}> .`)
      .join('\n');
  }

  /**
   * Serialize head graph
   */
  serializeHead(nanopubUri) {
    return `<${nanopubUri}#Head> {
  <${nanopubUri}> a np:Nanopublication ;
    np:hasAssertion <${nanopubUri}#assertion> ;
    np:hasProvenance <${nanopubUri}#provenance> ;
    np:hasPublicationInfo <${nanopubUri}#pubinfo> .
}`;
  }

  /**
   * Serialize a graph (list of statements)
   */
  serializeGraph(statements) {
    if (!statements || statements.length === 0) {
      return '  # Empty graph';
    }
    
    return statements
      .map(st => `  ${st.subject} ${st.predicate} ${st.object} .`)
      .join('\n');
  }

  /**
   * Validate the generated nanopub
   */
  validate(trigContent) {
    const errors = [];
    
    // Check for required elements
    if (!trigContent.includes('np:Nanopublication')) {
      errors.push('Missing nanopublication declaration');
    }
    if (!trigContent.includes('np:hasAssertion')) {
      errors.push('Missing assertion graph reference');
    }
    if (!trigContent.includes('np:hasProvenance')) {
      errors.push('Missing provenance graph reference');
    }
    if (!trigContent.includes('np:hasPublicationInfo')) {
      errors.push('Missing publication info graph reference');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default NanopubBuilder;
