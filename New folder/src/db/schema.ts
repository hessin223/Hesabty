export const SCHEMA_VERSION = 3;

export const SQLITE_MIGRATIONS: Record<number, string> = {
  1: `
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('cash', 'bank', 'wallet', 'savings')),
      currency TEXT NOT NULL DEFAULT 'EGP',
      initial_balance REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      account_number TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      code TEXT NOT NULL DEFAULT '',
      is_system INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT,
      to_account_id TEXT,
      category_id TEXT NOT NULL,
      project_id TEXT,
      supplier_id TEXT,
      worker_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer', 'person_transfer', 'supplier_payment', 'worker_payout')),
      amount REAL NOT NULL CHECK(amount > 0),
      fee_amount REAL NOT NULL DEFAULT 0 CHECK(fee_amount >= 0),
      paid_by_personal INTEGER NOT NULL DEFAULT 0,
      reimbursed INTEGER NOT NULL DEFAULT 0,
      reference_no TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      occurred_at TEXT NOT NULL,
      is_voided INTEGER NOT NULL DEFAULT 0,
      void_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON transactions(occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);
  `,
  2: `
    CREATE TABLE IF NOT EXISTS domain_store (
      collection_key TEXT PRIMARY KEY NOT NULL,
      json_payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS period_closings (
      id TEXT PRIMARY KEY NOT NULL,
      period_type TEXT NOT NULL CHECK(period_type IN ('day', 'month')),
      period_end TEXT NOT NULL,
      is_locked INTEGER NOT NULL DEFAULT 1,
      closing_balance_snapshot REAL NOT NULL DEFAULT 0,
      total_income_snapshot REAL NOT NULL DEFAULT 0,
      total_expense_snapshot REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      closed_at TEXT NOT NULL
    );
  `,
  3: `
    PRAGMA foreign_keys = OFF;
    DROP TABLE IF EXISTS transaction_details;
    CREATE TABLE IF NOT EXISTS transactions_v3 (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT,
      to_account_id TEXT,
      category_id TEXT NOT NULL,
      project_id TEXT,
      supplier_id TEXT,
      worker_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer', 'person_transfer', 'supplier_payment', 'worker_payout')),
      amount REAL NOT NULL CHECK(amount > 0),
      fee_amount REAL NOT NULL DEFAULT 0 CHECK(fee_amount >= 0),
      paid_by_personal INTEGER NOT NULL DEFAULT 0,
      reimbursed INTEGER NOT NULL DEFAULT 0,
      reference_no TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      occurred_at TEXT NOT NULL,
      is_voided INTEGER NOT NULL DEFAULT 0,
      void_reason TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );
    INSERT OR IGNORE INTO transactions_v3 SELECT * FROM transactions;
    DROP TABLE IF EXISTS transactions;
    ALTER TABLE transactions_v3 RENAME TO transactions;
    CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_occurred_at ON transactions(occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_project_id ON transactions(project_id);
    CREATE TABLE IF NOT EXISTS transaction_details (
      transaction_id TEXT PRIMARY KEY NOT NULL,
      recipient_name TEXT NOT NULL DEFAULT '',
      transfer_status TEXT NOT NULL DEFAULT 'completed' CHECK(transfer_status IN ('planned', 'completed')),
      transfer_method TEXT NOT NULL DEFAULT '',
      purpose TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );
    PRAGMA foreign_keys = ON;
  `,
};

export const SQLITE_DDL = SQLITE_MIGRATIONS[1] + '\n' + SQLITE_MIGRATIONS[2] + '\n' + SQLITE_MIGRATIONS[3];
