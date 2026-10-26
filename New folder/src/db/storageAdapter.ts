import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { SQLITE_MIGRATIONS, SCHEMA_VERSION } from './schema';
import type { LedgerSnapshot } from '../types/models';
import {
  createEmptyState,
  recalculateLedgerState,
} from '../services/ledgerCore.mjs';

const DB_NAME = 'hesabty_local_db';
const STORAGE_FALLBACK_KEY = 'hesabty_sqlite_snapshot_v2';

const DOMAIN_COLLECTIONS = [
  'settings',
  'uiPreferences',
  'savingsGoals',
  'projects',
  'tasks',
  'workers',
  'workerRecords',
  'suppliers',
  'purchases',
  'inventoryItems',
  'stockMovements',
  'assets',
  'budgets',
  'attachments',
  'processedSubmissionIds',
] as const;

/**
 * Local-First Persistent Storage Engine (v2)
 * - Native Android: Executes SQLite migrations (v1 -> v2) with foreign-key enforcement.
 * - Browser Preview: Uses separate browser persistent storage adapter (`localStorage`/`IndexedDB` compatible)
 *   explicitly documented as independent from native Android device storage.
 * - Never seeds fake financial records.
 */
export class HesabtyDatabase {
  private sqliteConnection: SQLiteConnection | null = null;
  private db: SQLiteDBConnection | null = null;
  private isNativeSqlite = false;
  private storageEngineName = 'SQLite Native / Browser Persistent Adapter';

  async initialize(): Promise<LedgerSnapshot> {
    if (Capacitor.isNativePlatform()) {
      try {
        this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);
        this.db = await this.sqliteConnection.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          SCHEMA_VERSION,
          false
        );
        await this.db.open();
        await this.runVersionedMigrations();
        this.isNativeSqlite = true;
        this.storageEngineName = 'Capacitor Android SQLite (v3)';
        return await this.loadFromNativeSqlite();
      } catch (err) {
        console.error('Native SQLite initialization error:', err);
        throw new Error('تعذر تهيئة قاعدة بيانات SQLite الأصلية على الجهاز');
      }
    }

    this.storageEngineName = 'Web Persistent Storage (منفصل عن تخزين الهاتف)';
    return this.loadFromWebPersistence();
  }

  private async runVersionedMigrations(): Promise<void> {
    if (!this.db) return;
    const result = await this.db.query('PRAGMA user_version;');
    let currentVersion = Number(result.values?.[0]?.user_version || 0);
    for (let version = currentVersion + 1; version <= SCHEMA_VERSION; version += 1) {
      await this.db.execute(SQLITE_MIGRATIONS[version]);
      await this.db.execute(`PRAGMA user_version = ${version};`);
      currentVersion = version;
    }
  }

  getEngineName(): string {
    return this.storageEngineName;
  }

  private async loadFromNativeSqlite(): Promise<LedgerSnapshot> {
    if (!this.db) return createEmptyState();
    const empty = createEmptyState();

    const accRes = await this.db.query('SELECT * FROM accounts ORDER BY created_at ASC;');
    const txRes = await this.db.query('SELECT * FROM transactions ORDER BY occurred_at DESC, created_at DESC;');
    const txDetailRes = await this.db.query('SELECT * FROM transaction_details;');
    const catRes = await this.db.query('SELECT * FROM categories;');
    const clsRes = await this.db.query('SELECT * FROM period_closings ORDER BY period_end DESC;');
    const domRes = await this.db.query('SELECT * FROM domain_store;');

    const accounts = (accRes.values || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      currency: r.currency,
      initialBalance: Number(r.initial_balance),
      currentBalance: Number(r.current_balance),
      accountNumber: r.account_number || '',
      notes: r.notes || '',
      isArchived: Boolean(r.is_archived),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const transactionDetails = new Map((txDetailRes.values || []).map((row: any) => [row.transaction_id, row]));
    const transactions = (txRes.values || []).map((r: any) => {
      const details = transactionDetails.get(r.id) || {};
      return ({
      id: r.id,
      accountId: r.account_id,
      toAccountId: r.to_account_id,
      categoryId: r.category_id,
      projectId: r.project_id,
      supplierId: r.supplier_id,
      workerId: r.worker_id,
      type: r.type,
      amount: Number(r.amount),
      feeAmount: Number(r.fee_amount || 0),
      paidByPersonal: Boolean(r.paid_by_personal),
      reimbursed: Boolean(r.reimbursed),
      referenceNo: r.reference_no || '',
      note: r.note || '',
      occurredAt: r.occurred_at,
      isVoided: Boolean(r.is_voided),
      voidReason: r.void_reason || '',
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      recipientName: details.recipient_name || '',
      transferStatus: details.transfer_status || 'completed',
      transferMethod: details.transfer_method || '',
      purpose: details.purpose || '',
    });
    });

    const categories =
      catRes.values && catRes.values.length > 0
        ? catRes.values.map((r: any) => ({
            id: r.id,
            parentId: r.parent_id || null,
            name: r.name,
            type: r.type,
            code: r.code || '',
            isSystem: Boolean(r.is_system),
          }))
        : empty.categories;

    const periodClosings = (clsRes.values || []).map((r: any) => ({
      id: r.id,
      periodType: r.period_type,
      periodEnd: r.period_end,
      isLocked: Boolean(r.is_locked),
      closingBalanceSnapshot: Number(r.closing_balance_snapshot),
      totalIncomeSnapshot: Number(r.total_income_snapshot),
      totalExpenseSnapshot: Number(r.total_expense_snapshot),
      notes: r.notes || '',
      closedAt: r.closed_at,
    }));

    const domainData: Record<string, any> = {};
    for (const row of domRes.values || []) {
      try {
        domainData[row.collection_key] = JSON.parse(row.json_payload);
      } catch {
        // Ignore malformed collection row
      }
    }

    return recalculateLedgerState({
      ...empty,
      ...domainData,
      accounts,
      categories,
      transactions,
      periodClosings,
    });
  }

  private loadFromWebPersistence(): LedgerSnapshot {
    try {
      const raw = window.localStorage.getItem(STORAGE_FALLBACK_KEY);
      if (!raw) {
        const initial = createEmptyState();
        this.saveToWebPersistence(initial);
        return initial;
      }
      const parsed = JSON.parse(raw);
      return recalculateLedgerState({
        ...createEmptyState(),
        ...parsed,
      });
    } catch {
      return createEmptyState();
    }
  }

  private saveToWebPersistence(snapshot: LedgerSnapshot): void {
    try {
      window.localStorage.setItem(STORAGE_FALLBACK_KEY, JSON.stringify(snapshot));
    } catch (e) {
      console.error('Failed to persist web snapshot:', e);
    }
  }

  async saveSnapshot(snapshot: LedgerSnapshot): Promise<void> {
    if (!this.isNativeSqlite) {
      this.saveToWebPersistence(snapshot);
      return;
    }

    if (this.db) {
      await this.db.execute('BEGIN TRANSACTION;');
      try {
        await this.db.execute('DELETE FROM transactions;');
        await this.db.execute('DELETE FROM transaction_details;');
        await this.db.execute('DELETE FROM accounts;');
        await this.db.execute('DELETE FROM categories;');
        await this.db.execute('DELETE FROM period_closings;');

        for (const acc of snapshot.accounts) {
          await this.db.run(
            'INSERT INTO accounts (id, name, type, currency, initial_balance, current_balance, account_number, notes, is_archived, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [
              acc.id,
              acc.name,
              acc.type,
              acc.currency,
              acc.initialBalance,
              acc.currentBalance,
              acc.accountNumber || '',
              acc.notes || '',
              acc.isArchived ? 1 : 0,
              acc.createdAt,
              acc.updatedAt,
            ]
          );
        }

        for (const cat of snapshot.categories) {
          await this.db.run(
            'INSERT INTO categories (id, parent_id, name, type, code, is_system) VALUES (?, ?, ?, ?, ?, ?);',
            [cat.id, cat.parentId || null, cat.name, cat.type, cat.code || '', cat.isSystem ? 1 : 0]
          );
        }

        for (const tx of snapshot.transactions) {
          await this.db.run(
            'INSERT INTO transactions (id, account_id, to_account_id, category_id, project_id, supplier_id, worker_id, type, amount, fee_amount, paid_by_personal, reimbursed, reference_no, note, occurred_at, is_voided, void_reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [
              tx.id,
              tx.accountId || null,
              tx.toAccountId || null,
              tx.categoryId,
              tx.projectId || null,
              tx.supplierId || null,
              tx.workerId || null,
              tx.type,
              tx.amount,
              tx.feeAmount || 0,
              tx.paidByPersonal ? 1 : 0,
              tx.reimbursed ? 1 : 0,
              tx.referenceNo || '',
              tx.note || '',
              tx.occurredAt,
              tx.isVoided ? 1 : 0,
              tx.voidReason || '',
              tx.createdAt,
              tx.updatedAt || tx.createdAt,
            ]
          );
          await this.db.run(
            'INSERT INTO transaction_details (transaction_id, recipient_name, transfer_status, transfer_method, purpose) VALUES (?, ?, ?, ?, ?);',
            [tx.id, tx.recipientName || '', tx.transferStatus || 'completed', tx.transferMethod || '', tx.purpose || '']
          );
        }

        for (const cls of snapshot.periodClosings || []) {
          await this.db.run(
            'INSERT INTO period_closings (id, period_type, period_end, is_locked, closing_balance_snapshot, total_income_snapshot, total_expense_snapshot, notes, closed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);',
            [
              cls.id,
              cls.periodType,
              cls.periodEnd,
              cls.isLocked ? 1 : 0,
              cls.closingBalanceSnapshot,
              cls.totalIncomeSnapshot,
              cls.totalExpenseSnapshot,
              cls.notes || '',
              cls.closedAt,
            ]
          );
        }

        const now = new Date().toISOString();
        for (const key of DOMAIN_COLLECTIONS) {
          const payload = JSON.stringify((snapshot as any)[key] ?? []);
          await this.db.run(
            'INSERT OR REPLACE INTO domain_store (collection_key, json_payload, updated_at) VALUES (?, ?, ?);',
            [key, payload, now]
          );
        }

        await this.db.execute('COMMIT;');
      } catch (err) {
        await this.db.execute('ROLLBACK;');
        throw err;
      }
    }
  }

  async clearAll(): Promise<LedgerSnapshot> {
    const fresh = createEmptyState();
    await this.saveSnapshot(fresh);
    return fresh;
  }
}

export const dbInstance = new HesabtyDatabase();
