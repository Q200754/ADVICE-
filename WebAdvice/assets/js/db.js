
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
    this.memStore = {};
    this._readyPromise = this.init();
  }

  // ══════════════════════════════════════════════════
  // INITIALIZE DATABASE
  // ══════════════════════════════════════════════════

  async init() {
    if (!window.indexedDB) {
      console.warn('IndexedDB is not supported.');
      return null;
    }

    return new Promise((resolve) => {
      let request;

      try {
        request = window.indexedDB.open(
          this.dbName,
          this.dbVersion
        );
      } catch (err) {
        console.warn('Database open error:', err);
        resolve(null);
        return;
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, {
            keyPath: 'key'
          });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;

        // Close old connection when another tab upgrades DB
        this.db.onversionchange = () => {
          this.db.close();
          this.db = null;
        };

        resolve(this.db);
      };

      request.onerror = () => {
        console.warn(
          'IndexedDB initialization failed:',
          request.error
        );

        resolve(null);
      };

      request.onblocked = () => {
        console.warn('IndexedDB connection is blocked.');
      };
    });
  }

  // ══════════════════════════════════════════════════
  // WAIT FOR DATABASE
  // ══════════════════════════════════════════════════

  async ready() {
    return this._readyPromise;
  }

  // ══════════════════════════════════════════════════
  // SAVE MYSTERY IMAGE
  // ══════════════════════════════════════════════════

  async saveMysteryImage(
    dataUrl,
    title = 'รูปภาพคำตอบ'
  ) {
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Invalid image data.');
    }

    await this.ready();

    const imageData = {
      key: 'mystery_image',
      dataUrl,
      title,
      updatedAt: Date.now()
    };

    // IndexedDB unavailable: use temporary memory storage
    if (!this.db) {
      this.memStore['mystery_image'] = imageData;
      return true;
    }

    try {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(
          [this.storeName],
          'readwrite'
        );

        const store = tx.objectStore(this.storeName);

        store.put(imageData);

        tx.oncomplete = () => resolve(true);

        tx.onerror = () => {
          reject(tx.error || new Error('Save transaction failed.'));
        };

        tx.onabort = () => {
          reject(tx.error || new Error('Save transaction aborted.'));
        };
      });

      return true;

    } catch (err) {
      console.error('Image save error:', err);

      // Keep a temporary copy if database save fails
      this.memStore['mystery_image'] = imageData;

      return false;
    }
  }

  // ══════════════════════════════════════════════════
  // GET MYSTERY IMAGE
  // ══════════════════════════════════════════════════

  async getMysteryImage() {
    await this.ready();

    if (!this.db) {
      const item = this.memStore['mystery_image'];
      return item ? item.dataUrl : null;
    }

    try {
      const result = await new Promise((resolve, reject) => {
        const tx = this.db.transaction(
          [this.storeName],
          'readonly'
        );

        const store = tx.objectStore(this.storeName);
        const request = store.get('mystery_image');

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      });

      if (result && result.dataUrl) {
        return result.dataUrl;
      }

      // Fallback to temporary memory storage
      const backup = this.memStore['mystery_image'];

      return backup ? backup.dataUrl : null;

    } catch (err) {
      console.error('Image retrieval error:', err);

      const backup = this.memStore['mystery_image'];

      return backup ? backup.dataUrl : null;
    }
  }

  // ══════════════════════════════════════════════════
  // CLEAR MYSTERY IMAGE
  // ══════════════════════════════════════════════════

  async clearMysteryImage() {
    await this.ready();

    delete this.memStore['mystery_image'];

    if (!this.db) {
      return true;
    }

    try {
      await new Promise((resolve, reject) => {
        const tx = this.db.transaction(
          [this.storeName],
          'readwrite'
        );

        const store = tx.objectStore(this.storeName);

        store.delete('mystery_image');

        tx.oncomplete = () => resolve(true);

        tx.onerror = () => {
          reject(tx.error || new Error('Delete transaction failed.'));
        };

        tx.onabort = () => {
          reject(tx.error || new Error('Delete transaction aborted.'));
        };
      });

      return true;

    } catch (err) {
      console.error('Image deletion error:', err);
      return false;
    }
  }

  // ══════════════════════════════════════════════════
  // CLOSE DATABASE
  // ══════════════════════════════════════════════════

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// ══════════════════════════════════════════════════
// GLOBAL IMAGE STORAGE
// ══════════════════════════════════════════════════

window.imageStorage = new ImageStorage();
