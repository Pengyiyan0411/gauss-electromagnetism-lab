export interface UserProgress {
  userId: string;
  topicId: string;
  masteryProbability: number; // 0.0 ~ 1.0
  attemptCount: number;
  lastUpdateTime: number;
}

export class IndexedDBManager {
  private dbName = 'ElectromagnetismEduDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  public async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress', { keyPath: ['userId', 'topicId'] });
        }
        if (!db.objectStoreNames.contains('logs')) {
          const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
          logStore.createIndex('userId', 'userId', { unique: false });
        }
      };

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event: any) => {
        console.error('IndexedDB init error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  public async saveProgress(progress: UserProgress): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['progress'], 'readwrite');
      const store = transaction.objectStore('progress');
      const request = store.put(progress);
      request.onsuccess = () => resolve();
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  public async getProgress(userId: string, topicId: string): Promise<UserProgress | null> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['progress'], 'readonly');
      const store = transaction.objectStore('progress');
      const request = store.get([userId, topicId]);
      request.onsuccess = (e: any) => resolve(e.target.result || null);
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  public async logActivity(userId: string, action: string, details: any): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['logs'], 'readwrite');
      const store = transaction.objectStore('logs');
      const request = store.add({ userId, action, details, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  // 预留云端同步接口 (LTI 1.3 / REST API)
  public async syncToCloud(): Promise<boolean> {
    console.log("Mocking sync to cloud LMS...");
    return Promise.resolve(true);
  }
}
