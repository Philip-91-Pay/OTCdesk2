import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Firestore,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';
import { Trade, BankDetail, ClientDetail } from './types';

// Operation Types defined by the Firebase Integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Global handleFirestoreError conforming directly to required schema
export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'mock-system-uid',
      email: 'philip@91-payments.com',
      emailVerified: true,
      isAnonymous: false,
    },
    operationType,
    path,
  };
  console.error('Firestore SECURE Error: ', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

// Determine if Firebase is configured/activated
export const isFirebaseConfigured =
  firebaseConfig &&
  firebaseConfig.apiKey &&
  firebaseConfig.apiKey.trim() !== "" &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId.trim() !== "";

let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log('Firebase Cloud Firestore successfully initialized.');
  } catch (err) {
    console.error('Firebase failed to initialize. Falling back to local engine.', err);
  }
} else {
  console.log('Firebase applet key missing or unconfigured. Running on Sandbox Local Storage Engine.');
}

export const db = dbInstance;

async function testConnection() {
  if (dbInstance) {
    try {
      await getDocFromServer(doc(dbInstance, 'test', 'connection'));
      console.log('Firebase Cloud Firestore connection validated.');
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      } else {
        console.log("Firestore connection initialized. Standard permission error is expected for undefined path:", error);
      }
    }
  }
}
testConnection();

/**
 * Fallback Database Engine using browser LocalStorage
 * Ensures seamless operation and unblocked preview transitions.
 */
class LocalStorageEngine {
  private key = '91_PAYMENTS_FX_TRADES';

  getTrades(): Trade[] {
    const raw = localStorage.getItem(this.key);
    if (!raw) {
      // Pre-seed sample desk actions for demonstration
      const nowMs = Date.now();
      const seed: Trade[] = [
        {
          id: 'mock-uuid-1',
          token: '91P-TR5X',
          app_initiation_timestamp: new Date(nowMs - 45 * 60 * 1000).toISOString(), // 45m ago
          status: 'Successfully Executed',
          unit: 'Treasury',
          corridor: 'NGN',
          trade_date: new Date(nowMs).toISOString().split('T')[0],
          value_date: new Date(nowMs).toISOString().split('T')[0],
          partner: 'Nairagram',
          source_bank: 'Access Bank PLC',
          trade_type: 'Buy',
          currency: 'USD',
          amount: 25000,
          rate: 1585,
          ngn_equi: 39625000,
          destination_account: 'Nairagram Payout Desk Fx #4892',
          beneficiary_account: '91-Pay Sterling Settlement Cole',
          bank_executed_timestamp: new Date(nowMs - 15 * 60 * 1000).toISOString(), // executed 30 minutes after initiation (SLA On Time)
          sla_status: 'On Time',
          sla_elapsed_minutes: 30,
        },
        {
          id: 'mock-uuid-2',
          token: '91P-HS2Q',
          app_initiation_timestamp: new Date(nowMs - 180 * 60 * 1000).toISOString(), // 3 hours ago (operational)
          status: 'Successfully Executed',
          unit: 'Treasury',
          corridor: 'KES',
          trade_date: new Date(nowMs).toISOString().split('T')[0],
          value_date: new Date(nowMs).toISOString().split('T')[0],
          partner: 'Juicyway',
          source_bank: 'Standard Chartered Hub',
          trade_type: 'Sell',
          currency: 'GBP',
          amount: 12500,
          rate: 2010,
          ngn_equi: 25125000,
          destination_account: 'Juicyway GHS Collection Box',
          beneficiary_account: '91-Pay GBP Union Bank',
          bank_executed_timestamp: new Date(nowMs - 90 * 60 * 1050).toISOString(), // Executed 90 operational minutes after stamp (SLA Breach)
          sla_status: 'SLA Breach',
          sla_elapsed_minutes: 90,
        },
        {
          id: 'mock-uuid-3',
          token: '91P-PL9K',
          app_initiation_timestamp: new Date(nowMs - 25 * 60 * 1000).toISOString(), // 25m ago
          status: 'Pending Reconciliation',
          unit: 'Treasury',
          corridor: 'GHS',
          trade_date: new Date(nowMs).toISOString().split('T')[0],
          value_date: new Date(nowMs).toISOString().split('T')[0],
          partner: 'Cosmo Remit',
          source_bank: 'EcoBank Ghana',
          trade_type: 'Buy',
          currency: 'USD',
          amount: 5000,
          rate: 1580,
          ngn_equi: 7900000,
          destination_account: '',
          beneficiary_account: '',
          bank_executed_timestamp: '',
        },
        {
          id: 'mock-uuid-4',
          token: '91P-8Y4Z',
          app_initiation_timestamp: new Date(nowMs - 4.5 * 60 * 60 * 1000).toISOString(), // 4.5 hours ago (eligible for Discrepancy Phantom Audit)
          status: 'Pending Reconciliation',
          unit: 'Treasury',
          corridor: 'XOF',
          trade_date: new Date(nowMs - 4.5 * 60 * 60 * 1000).toISOString().split('T')[0],
          value_date: new Date(nowMs).toISOString().split('T')[0],
          partner: 'Fincra',
          source_bank: 'UBA Senegal',
          trade_type: 'Sell',
          currency: 'USDC',
          amount: 80000,
          rate: 1590,
          ngn_equi: 127200000,
          destination_account: '',
          beneficiary_account: '',
          bank_executed_timestamp: '',
        },
        {
          id: 'mock-uuid-5',
          token: '91P-W3N9',
          app_initiation_timestamp: new Date(nowMs - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          status: 'Critical Error: Phantom Token',
          unit: 'Treasury',
          corridor: 'NGN',
          trade_date: new Date(nowMs - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          value_date: new Date(nowMs - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          partner: 'Starks',
          source_bank: 'GTBank Lagos',
          trade_type: 'Buy',
          currency: 'USD',
          amount: 150000,
          rate: 1575,
          ngn_equi: 236250000,
          destination_account: 'Starks Settlement Pool',
          beneficiary_account: '91-Pay Providus Sweep',
          bank_executed_timestamp: '',
        }
      ];
      localStorage.setItem(this.key, JSON.stringify(seed));
      return seed;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveTrades(trades: Trade[]) {
    localStorage.setItem(this.key, JSON.stringify(trades));
    window.dispatchEvent(new Event('local_db_update'));
  }

  createTrade(trade: Trade) {
    const trades = this.getTrades();
    trades.push(trade);
    this.saveTrades(trades);
  }

  updateTrade(id: string, updates: Partial<Trade>) {
    const trades = this.getTrades();
    const index = trades.findIndex(t => t.id === id);
    if (index !== -1) {
      trades[index] = { ...trades[index], ...updates };
      this.saveTrades(trades);
    }
  }

  onUpdate(callback: (trades: Trade[]) => void): () => void {
    const handler = () => {
      const sorted = this.getTrades().sort((a, b) => b.app_initiation_timestamp.localeCompare(a.app_initiation_timestamp));
      callback(sorted);
    };
    window.addEventListener('local_db_update', handler);
    // Initialize immediately
    const sorted = this.getTrades().sort((a, b) => b.app_initiation_timestamp.localeCompare(a.app_initiation_timestamp));
    callback(sorted);
    return () => {
      window.removeEventListener('local_db_update', handler);
    };
  }

  // --- BANK DETAILS EXTENSION ---
  private banksKey = '91_PAYMENTS_BANK_DETAILS';
  
  getBankDetails(): BankDetail[] {
    const raw = localStorage.getItem(this.banksKey);
    if (!raw) {
      const defaults: BankDetail[] = [
        {
          id: 'bank-usd-1',
          accountName: '91-Pay Sterling Settlement Cole',
          accountNumber: '20948574893',
          bankName: 'Sterling Bank Plc',
          currency: 'USD',
        },
        {
          id: 'bank-gbp-1',
          accountName: '91-Pay GBP Union Bank',
          accountNumber: '1002348576',
          bankName: 'Union Bank',
          currency: 'GBP',
        },
        {
          id: 'bank-eur-1',
          accountName: '91-Pay West Euro Pool',
          accountNumber: '5847382910',
          bankName: 'Societe Generale',
          currency: 'EUR',
        }
      ];
      localStorage.setItem(this.banksKey, JSON.stringify(defaults));
      return defaults;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveBankDetails(banks: BankDetail[]) {
    localStorage.setItem(this.banksKey, JSON.stringify(banks));
    window.dispatchEvent(new Event('local_banks_update'));
  }

  createBankDetail(bank: BankDetail) {
    const banks = this.getBankDetails();
    banks.push(bank);
    this.saveBankDetails(banks);
  }

  updateBankDetail(id: string, updates: Partial<BankDetail>) {
    const banks = this.getBankDetails();
    const index = banks.findIndex(b => b.id === id);
    if (index !== -1) {
      banks[index] = { ...banks[index], ...updates };
      this.saveBankDetails(banks);
    }
  }

  deleteBankDetail(id: string) {
    const banks = this.getBankDetails();
    const filtered = banks.filter(b => b.id !== id);
    this.saveBankDetails(filtered);
  }

  onBanksUpdate(callback: (banks: BankDetail[]) => void): () => void {
    const handler = () => {
      callback(this.getBankDetails());
    };
    window.addEventListener('local_banks_update', handler);
    callback(this.getBankDetails());
    return () => {
      window.removeEventListener('local_banks_update', handler);
    };
  }

  // --- CLIENT DETAILS EXTENSION ---
  private clientsKey = '91_PAYMENTS_CLIENT_DETAILS';
  
  getClientDetails(): ClientDetail[] {
    const raw = localStorage.getItem(this.clientsKey);
    if (!raw) {
      const defaults: ClientDetail[] = [
        { id: 'client-1', name: 'Nairagram' },
        { id: 'client-2', name: 'Juicyway' },
        { id: 'client-3', name: 'Cosmo Remit' },
        { id: 'client-4', name: 'Chinelo Fx' },
        { id: 'client-5', name: 'Rolla' },
      ];
      localStorage.setItem(this.clientsKey, JSON.stringify(defaults));
      return defaults;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  saveClientDetails(clients: ClientDetail[]) {
    localStorage.setItem(this.clientsKey, JSON.stringify(clients));
    window.dispatchEvent(new Event('local_clients_update'));
  }

  createClientDetail(client: ClientDetail) {
    const clients = this.getClientDetails();
    clients.push(client);
    this.saveClientDetails(clients);
  }

  updateClientDetail(id: string, updates: Partial<ClientDetail>) {
    const clients = this.getClientDetails();
    const index = clients.findIndex(c => c.id === id);
    if (index !== -1) {
      clients[index] = { ...clients[index], ...updates };
      this.saveClientDetails(clients);
    }
  }

  deleteClientDetail(id: string) {
    const clients = this.getClientDetails();
    const filtered = clients.filter(c => c.id !== id);
    this.saveClientDetails(filtered);
  }

  onClientsUpdate(callback: (clients: ClientDetail[]) => void): () => void {
    const handler = () => {
      callback(this.getClientDetails());
    };
    window.addEventListener('local_clients_update', handler);
    callback(this.getClientDetails());
    return () => {
      window.removeEventListener('local_clients_update', handler);
    };
  }
}

const localDB = new LocalStorageEngine();

// Helper to remove any undefined fields before writing to Firestore
function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    if (result[key] === undefined) {
      delete result[key];
    }
  }
  return result;
}

/**
 * High-Integrity Database Portal interfacing between Firestore or LocalStorage.
 */
export const dbPortal = {
  isCloudMode(): boolean {
    return db !== null;
  },

  async createTrade(trade: Trade): Promise<void> {
    if (db) {
      const path = `trades/${trade.id}`;
      try {
        const cleaned = cleanUndefined(trade);
        await setDoc(doc(db, 'trades', trade.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      localDB.createTrade(trade);
    }
  },

  async updateTrade(id: string, updates: Partial<Trade>): Promise<void> {
    if (db) {
      const path = `trades/${id}`;
      try {
        const cleaned = cleanUndefined(updates);
        await updateDoc(doc(db, 'trades', id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      localDB.updateTrade(id, updates);
    }
  },

  async getTradesList(): Promise<Trade[]> {
    if (db) {
      const path = 'trades';
      try {
        const q = query(collection(db, 'trades'), orderBy('app_initiation_timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const list: Trade[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Trade);
        });
        return list;
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, path);
      }
    } else {
      return localDB.getTrades().sort((a, b) => b.app_initiation_timestamp.localeCompare(a.app_initiation_timestamp));
    }
  },

  subscribeTrades(callback: (trades: Trade[]) => void, onError?: (err: any) => void): () => void {
    if (db) {
      const path = 'trades';
      const q = query(collection(db, 'trades'), orderBy('app_initiation_timestamp', 'desc'));
      return onSnapshot(
        q,
        (snapshot) => {
          const list: Trade[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as Trade);
          });
          callback(list);
        },
        (error) => {
          if (onError) onError(error);
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    } else {
      return localDB.onUpdate(callback);
    }
  },

  async deleteTrade(id: string): Promise<void> {
    if (db) {
      const path = `trades/${id}`;
      try {
        await deleteDoc(doc(db, 'trades', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      const trades = localDB.getTrades();
      const filtered = trades.filter(t => t.id !== id);
      localDB.saveTrades(filtered);
    }
  },

  // --- BANK DETAILS PORTAL METHODS ---
  subscribeBankDetails(callback: (banks: BankDetail[]) => void, onError?: (err: any) => void): () => void {
    if (db) {
      const path = 'bank_details';
      const q = query(collection(db, 'bank_details'));
      return onSnapshot(
        q,
        (snapshot) => {
          const list: BankDetail[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as BankDetail);
          });
          if (list.length === 0) {
            // Seed defaults
            const defaults = localDB.getBankDetails();
            defaults.forEach(async (b) => {
              try {
                const cleaned = cleanUndefined(b);
                await setDoc(doc(db, 'bank_details', b.id), cleaned);
              } catch (_) {}
            });
            callback(defaults);
          } else {
            callback(list);
          }
        },
        (error) => {
          if (onError) onError(error);
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    } else {
      return localDB.onBanksUpdate(callback);
    }
  },

  async createBankDetail(bank: BankDetail): Promise<void> {
    if (db) {
      const path = `bank_details/${bank.id}`;
      try {
        const cleaned = cleanUndefined(bank);
        await setDoc(doc(db, 'bank_details', bank.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      localDB.createBankDetail(bank);
    }
  },

  async updateBankDetail(id: string, updates: Partial<BankDetail>): Promise<void> {
    if (db) {
      const path = `bank_details/${id}`;
      try {
        const cleaned = cleanUndefined(updates);
        await updateDoc(doc(db, 'bank_details', id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      localDB.updateBankDetail(id, updates);
    }
  },

  async deleteBankDetail(id: string): Promise<void> {
    if (db) {
      const path = `bank_details/${id}`;
      try {
        await deleteDoc(doc(db, 'bank_details', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      localDB.deleteBankDetail(id);
    }
  },

  // Helper to remove any undefined fields before writing to Firestore
  // --- CLIENT DETAILS PORTAL METHODS ---
  subscribeClientDetails(callback: (clients: ClientDetail[]) => void, onError?: (err: any) => void): () => void {
    if (db) {
      const path = 'clients';
      const q = query(collection(db, 'clients'));
      return onSnapshot(
        q,
        (snapshot) => {
          const list: ClientDetail[] = [];
          snapshot.forEach((docSnap) => {
            list.push(docSnap.data() as ClientDetail);
          });
          if (list.length === 0) {
            // Seed defaults
            const defaults = localDB.getClientDetails();
            defaults.forEach(async (c) => {
              try {
                const cleaned = cleanUndefined(c);
                await setDoc(doc(db, 'clients', c.id), cleaned);
              } catch (_) {}
            });
            callback(defaults);
          } else {
            callback(list);
          }
        },
        (error) => {
          if (onError) onError(error);
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    } else {
      return localDB.onClientsUpdate(callback);
    }
  },

  async createClientDetail(client: ClientDetail): Promise<void> {
    if (db) {
      const path = `clients/${client.id}`;
      try {
        const cleaned = cleanUndefined(client);
        await setDoc(doc(db, 'clients', client.id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      localDB.createClientDetail(client);
    }
  },

  async updateClientDetail(id: string, updates: Partial<ClientDetail>): Promise<void> {
    if (db) {
      const path = `clients/${id}`;
      try {
        const cleaned = cleanUndefined(updates);
        await updateDoc(doc(db, 'clients', id), cleaned);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      localDB.updateClientDetail(id, updates);
    }
  },

  async deleteClientDetail(id: string): Promise<void> {
    if (db) {
      const path = `clients/${id}`;
      try {
        await deleteDoc(doc(db, 'clients', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      localDB.deleteClientDetail(id);
    }
  }
};
