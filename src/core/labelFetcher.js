/**
 * Label Fetcher for RDF URIs
 * Fetches rdfs:label from external sources
 */

export class LabelFetcher {
  constructor(options = {}) {
    this.options = {
      timeout: 5000,
      maxRetries: 2,
      ...options
    };
  }

  /**
   * Batch fetch labels for multiple URIs
   */
  async batchGetLabels(uris, existingLabels = {}) {
    const results = new Map();
    
    // Return existing labels immediately
    uris.forEach(uri => {
      if (existingLabels[uri]) {
        results.set(uri, existingLabels[uri]);
      }
    });
    
    // For URIs without existing labels, try to fetch
    const urisToFetch = uris.filter(uri => !existingLabels[uri]);
    
    if (urisToFetch.length === 0) {
      return results;
    }
    
    // Fetch in parallel with timeout
    const fetchPromises = urisToFetch.map(uri => 
      this.fetchLabel(uri).catch(err => {
        console.warn(`Failed to fetch label for ${uri}:`, err.message);
        return this.generateFallbackLabel(uri);
      })
    );
    
    try {
      const labels = await Promise.race([
        Promise.all(fetchPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Batch fetch timeout')), this.options.timeout)
        )
      ]);
      
      urisToFetch.forEach((uri, index) => {
        if (labels[index]) {
          results.set(uri, labels[index]);
        }
      });
    } catch (error) {
      console.warn('Batch label fetch failed:', error.message);
      // Return fallback labels for all unfetched URIs
      urisToFetch.forEach(uri => {
        results.set(uri, this.generateFallbackLabel(uri));
      });
    }
    
    return results;
  }

  /**
   * Fetch label for a single URI
   */
  async fetchLabel(uri) {
    // Try common label endpoints
    const endpoints = [
      `https://www.wikidata.org/wiki/Special:EntityData/${this.extractWikidataId(uri)}.json`,
      uri // Try dereferencing the URI directly
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: { 'Accept': 'application/rdf+xml, application/ld+json, text/turtle' },
          signal: AbortSignal.timeout(this.options.timeout)
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('json')) {
            const data = await response.json();
            const label = this.extractLabelFromJson(data, uri);
            if (label) return label;
          }
        }
      } catch (error) {
        // Try next endpoint
        continue;
      }
    }
    
    // Fallback to generating label from URI
    return this.generateFallbackLabel(uri);
  }

  /**
   * Extract Wikidata ID from URI
   */
  extractWikidataId(uri) {
    const match = uri.match(/wikidata\.org\/(?:wiki|entity)\/(Q\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract label from JSON-LD or Wikidata JSON
   */
  extractLabelFromJson(data, uri) {
    // Wikidata format
    if (data.entities) {
      const entity = Object.values(data.entities)[0];
      if (entity && entity.labels && entity.labels.en) {
        return entity.labels.en.value;
      }
    }
    
    // JSON-LD format
    if (data['@graph']) {
      const node = data['@graph'].find(n => n['@id'] === uri);
      if (node && node['rdfs:label']) {
        return typeof node['rdfs:label'] === 'string' 
          ? node['rdfs:label']
          : node['rdfs:label']['@value'];
      }
    }
    
    // Simple format
    if (data['rdfs:label']) {
      return typeof data['rdfs:label'] === 'string'
        ? data['rdfs:label']
        : data['rdfs:label']['@value'] || data['rdfs:label'][0];
    }
    
    return null;
  }

  /**
   * Generate a human-readable label from URI
   */
  generateFallbackLabel(uri) {
    if (!uri) return '';
    
    // Remove angle brackets if present
    uri = uri.replace(/[<>]/g, '');
    
    // Common known predicates
    const knownLabels = {
      'http://www.w3.org/1999/02/22-rdf-syntax-ns#type': 'type',
      'http://www.w3.org/2000/01/rdf-schema#label': 'label',
      'http://purl.org/dc/terms/created': 'created',
      'http://purl.org/dc/terms/creator': 'creator',
      'http://purl.org/dc/terms/description': 'description',
      'http://schema.org/about': 'about',
      'http://www.w3.org/ns/prov#wasAttributedTo': 'was attributed to'
    };
    
    if (knownLabels[uri]) {
      return knownLabels[uri];
    }
    
    // Extract last part after # or /
    const parts = uri.split(/[#\/]/);
    let label = parts[parts.length - 1];
    
    if (!label && parts.length > 1) {
      label = parts[parts.length - 2];
    }
    
    if (!label) return uri;
    
    // Convert camelCase and snake_case to readable format
    label = label
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase
      .replace(/_/g, ' ')                   // snake_case
      .replace(/-/g, ' ')                   // kebab-case
      .trim()
      .replace(/\s+/g, ' ');                // normalize spaces
    
    // Remove common prefixes
    label = label
      .replace(/^has\s*/i, '')
      .replace(/^is\s*/i, '');
    
    // Capitalize first letter of each word
    label = label
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return label;
  }
}
