/**
 * ADVICE อ่างทอง - Storage Manager (IndexedDB)
 * Stores custom mystery answer image reliably in browser storage
 */

class ImageStorage {
  constructor() {
    this.dbName = 'AdviceMysteryDB';
    this.dbVersion = 1;
    this.storeName = 'mystery_data';
    this.db = null;
    this._readyPromise = this.init();
  }

  async init() {
    if (!window.indexedDB) {
      this.memStore = {};
      return;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = () => {
        this.memStore = {};
        resolve(null);
      };
    });
  }

  async ready() {
    return this._readyPromise;
  }

  async saveMysteryImage(dataUrl, title = 'รูปภาพคำตอบ') {
    await this.ready();
    try {
      localStorage.setItem('advice_mystery_backup', dataUrl.slice(0, 100)); // quick flag
    } catch (e) {}

    if (!this.db) {
      if (!this.memStore) this.memStore = {};
      this.memStore['mystery_image'] = { key: 'mystery_image', dataUrl, title, updatedAt: Date.now() };
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.put({ key: 'mystery_image', dataUrl, title, updatedAt: Date.now() });

      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async getMysteryImage() {
    await this.ready();
    if (!this.db) {
      return this.memStore ? this.memStore['mystery_image'] : null;
    }

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get('mystery_image');

      req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
      req.onerror = () => resolve(null);
    });
  }

  async clearMysteryImage() {
    await this.ready();
    if (!this.db) {
      if (this.memStore) delete this.memStore['mystery_image'];
      return;
    }

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.delete('mystery_image');
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }
}

window.imageStorage = new ImageStorage();
