/**
 * Label Fetcher for Nanopublication URIs
 * 
 * Fetches human-readable labels for URIs from various sources:
 * 1. Content negotiation (requesting RDF/Turtle)
 * 2. SPARQL endpoints
 * 3. URI parsing as fallback
 * 
 * Used by TemplateParser to get labels for predicates and objects
 */

export class LabelFetcher {
  constructor(options = {}) {
    this.options = {
      timeout: options.timeout || 10000,
      cache: options.cache !== false,
      ...options
    };
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Fetch a single label
   */
  async getLabel(uri, localLabels = {}) {
    if (!uri || typeof uri !== 'string') return null;
    
    // Check local labels first
    if (localLabels[uri]) {
      return this.normalizeLabel(localLabels[uri]);
    }
    
    // Check cache
    if (this.cache.has(uri)) {
      return this.cache.get(uri);
    }
    
    // Check if request is pending
    if (this.pendingRequests.has(uri)) {
      return this.pendingRequests.get(uri);
    }
    
    // Create new request
    const promise = this.fetchLabel(uri);
    this.pendingRequests.set(uri, promise);
    
    try {
      const label = await promise;
      this.cache.set(uri, label);
      return label;
    } finally {
      this.pendingRequests.delete(uri);
    }
  }

  /**
   * Fetch multiple labels in batch
   */
  async fetchBatch(uris, localLabels = {}) {
    const results = {};
    const promises = uris.map(async uri => {
      try {
        const label = await this.getLabel(uri, localLabels);
        if (label) {
          results[uri] = label;
        }
      } catch (error) {
        console.warn(`Failed to fetch label for ${uri}:`, error.message);
      }
    });
    
    await Promise.all(promises);
    return results;
  }

  /**
   * Fetch label from URI using content negotiation
   */
  async fetchLabel(uri) {
    try {
      // Try content negotiation first
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
      
      const response = await fetch(uri, {
        headers: {
          'Accept': 'application/rdf+xml, text/turtle, application/ld+json, text/plain'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        
        // Try to extract rdfs:label from response
        const label = this.extractLabelFromRdf(text, uri, contentType);
        if (label) {
          return label;
        }
      }
    } catch (error) {
      // Silently fail - will use fallback
      if (error.name !== 'AbortError') {
        console.debug(`Label fetch failed for ${uri}:`, error.message);
      }
    }
    
    // Fallback: parse label from URI
    return this.parseUriLabel(uri);
  }

  /**
   * Extract rdfs:label from RDF content
   * This is a simple extraction - a full RDF parser would be better
   */
  extractLabelFromRdf(content, uri, contentType) {
    if (!content) return null;
    
    try {
      // For JSON-LD
      if (contentType.includes('json')) {
        const data = JSON.parse(content);
        
        // Simple JSON-LD label extraction
        if (data['rdfs:label']) {
          return this.normalizeLabel(data['rdfs:label']);
        }
        if (data['@graph']) {
          for (const node of data['@graph']) {
            if (node['@id'] === uri && node['rdfs:label']) {
              return this.normalizeLabel(node['rdfs:label']);
            }
          }
        }
      }
      
      // For Turtle/RDF-XML - simple regex extraction
      // Match: <URI> rdfs:label "Label" or rdfs:label "Label"@en
      const labelRegex = new RegExp(
        `(?:<${uri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}>|rdfs:label)\\s+rdfs:label\\s+"([^"]+)"`,
        'i'
      );
      const match = content.match(labelRegex);
      if (match && match[1]) {
        return match[1];
      }
      
      // Also try to match just rdfs:label near the end of file
      const simpleLabelRegex = /rdfs:label\s+"([^"]+)"/i;
      const simpleMatch = content.match(simpleLabelRegex);
      if (simpleMatch && simpleMatch[1]) {
        return simpleMatch[1];
      }
      
    } catch (error) {
      console.debug('Failed to extract label from RDF:', error);
    }
    
    return null;
  }

  /**
   * Parse a human-readable label from a URI as fallback
   */
  parseUriLabel(uri) {
    if (!uri || typeof uri !== 'string') return '';
    
    // Special common cases
    const specialCases = {
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': 'Type',
      'http://www.w3.org/2000/01/rdf-schema#label': 'Label',
      'http://www.w3.org/2000/01/rdf-schema#comment': 'Comment',
      'http://purl.org/dc/terms/title': 'Title',
      'http://purl.org/dc/terms/description': 'Description',
      'http://xmlns.com/foaf/0.1/name': 'Name',
      'http://schema.org/name': 'Name',
      'http://schema.org/description': 'Description',
    };
    
    if (specialCases[uri]) {
      return specialCases[uri];
    }
    
    // Extract the fragment or last path segment
    const parts = uri.split(/[#\/]/);
    let label = parts[parts.length - 1];
    
    // If empty, try the second-to-last part
    if (!label && parts.length > 1) {
      label = parts[parts.length - 2];
    }
    
    if (!label) return uri;
    
    // Clean up the label
    label = label
      // Split camelCase: "hasValue" -> "has Value"
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Replace common prefixes
      .replace(/^has/, 'Has')
      .replace(/^is/, 'Is')
      // Replace underscores and hyphens with spaces
      .replace(/[_-]/g, ' ')
      // Clean up whitespace
      .trim()
      .replace(/\s+/g, ' ');
    
    // Capitalize first letter
    label = label.charAt(0).toUpperCase() + label.slice(1);
    
    return label;
  }

  /**
   * Normalize label from various formats
   */
  normalizeLabel(label) {
    if (!label) return null;
    
    if (typeof label === 'string') {
      return label;
    }
    
    if (typeof label === 'object') {
      // Handle JSON-LD style labels
      if (label['@value']) {
        return label['@value'];
      }
      if (label.value) {
        return label.value;
      }
      if (label.label) {
        return label.label;
      }
    }
    
    return String(label);
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      pending: this.pendingRequests.size
    };
  }
}

export default LabelFetcher;
