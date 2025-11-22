// This file is db.js

class PromptDB {
  constructor() {
    this.dbName = 'PromptNavigatorDB';
    this.version = 1;
    this.db = null;
  }

  // 1. Open the database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        console.log('[PN-DB] Database initialized');
        resolve();
      };

      // 2. Create the 'prompts' table (Object Store) if it doesn't exist
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('prompts')) {
          const promptStore = db.createObjectStore('prompts', { keyPath: 'id' });
          promptStore.createIndex('chatId', 'chatId', { unique: false });
          promptStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // 3. Save a message
  async savePrompt(prompt) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject('DB not initialized');
        return;
      }
      const transaction = this.db.transaction(['prompts'], 'readwrite');
      const store = transaction.objectStore('prompts');
      const request = store.put(prompt); // 'put' will add or update

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}