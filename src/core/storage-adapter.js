/**
 * Storage adapter that works in both browser and Zotero environments
 */
export class StorageAdapter {
  constructor(customStorage = null) {
    if (customStorage) {
      this.storage = customStorage;  // Use injected storage
    } else if (typeof localStorage !== 'undefined') {
      this.storage = localStorage;    // Default browser
    } else {
      this.storage = this.createInMemoryStorage();  // Fallback
    }
  }

  createInMemoryStorage() { 
    const memoryStore = {};
    return {
      getItem: (key) => memoryStore[key] || null,
      setItem: (key, value) => { memoryStore[key] = value; },
      removeItem: (key) => { delete memoryStore[key]; }
    };
  }

  getItem(key) {
    return this.storage.getItem(key);
  }

  setItem(key, value) {
    this.storage.setItem(key, value);
  }

  removeItem(key) {
    this.storage.removeItem(key);
  }
}

// Export singleton instance
export const storage = new StorageAdapter();
