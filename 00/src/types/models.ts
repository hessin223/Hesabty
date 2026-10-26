export type AccountType = 'cash' | 'bank' | 'wallet' | 'savings';

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'person_transfer'
  | 'supplier_payment'
  | 'worker_payout';

export type ModuleId =
  | 'dashboard'
  | 'accounts'
  | 'transactions'
  | 'income_expense'
  | 'transfers'
  | 'savings'
  | 'projects'
  | 'tasks'
  | 'workers'
  | 'purchases'
  | 'inventory'
  | 'assets'
  | 'categories'
  | 'budgets_reports'
  | 'attachments'
  | 'closing'
  | 'backup'
  | 'settings';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  accountNumber?: string;
  notes?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  type: 'income' | 'expense';
  code?: string;
  isSystem: boolean;
}

export interface Transaction {
  id: string;
  accountId: string | null;
  toAccountId?: string | null;
  categoryId: string;
  projectId?: string | null;
  supplierId?: string | null;
  workerId?: string | null;
  type: TransactionType;
  amount: number;
  feeAmount?: number;
  paidByPersonal?: boolean;
  reimbursed?: boolean;
  referenceNo?: string;
  recipientName?: string;
  transferStatus?: 'planned' | 'completed';
  transferMethod?: string;
  purpose?: string;
  note: string;
  occurredAt: string;
  isVoided?: boolean;
  voidReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  linkedAccountId?: string | null;
  targetDate?: string | null;
  notes?: string;
  dataBase64?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientName?: string;
  location?: string;
  status: 'active' | 'completed' | 'on_hold';
  budget: number;
  totalSpent: number;
  totalIncome: number;
  personalReimbursementDue: number;
  startDate: string;
  createdAt: string;
}

export interface DailyTask {
  id: string;
  title: string;
  projectId?: string | null;
  dueDate: string;
  priority: 'high' | 'normal' | 'low';
  isCompleted: boolean;
  notes?: string;
  createdAt: string;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  phone?: string;
  projectId?: string | null;
  dailyRate: number;
  totalEarned: number;
  totalAdvances: number;
  totalPaid: number;
  remainingPayable: number;
  createdAt: string;
}

export interface WorkerRecord {
  id: string;
  workerId: string;
  projectId?: string | null;
  recordType: 'wage' | 'advance' | 'payout';
  amount: number;
  accountId?: string | null;
  occurredAt: string;
  note?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  specialty?: string;
  openingBalance: number;
  totalBilled: number;
  totalPaid: number;
  balanceDue: number;
  createdAt: string;
}

export interface PurchaseInvoice {
  id: string;
  supplierId: string;
  projectId?: string | null;
  invoiceNo?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  accountId?: string | null;
  occurredAt: string;
  note?: string;
  isVoided?: boolean;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  warehouseName: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  unitCost: number;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  projectId?: string | null;
  movementType: 'in' | 'out';
  quantity: number;
  occurredAt: string;
  note?: string;
}

export interface AssetItem {
  id: string;
  name: string;
  assetType: 'vehicle' | 'equipment' | 'property';
  plateOrSerial?: string;
  purchaseValue: number;
  currentValue: number;
  status: 'operational' | 'maintenance' | 'retired';
  projectId?: string | null;
  notes?: string;
  createdAt: string;
}

export interface CategoryBudget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
  updatedAt: string;
}

export interface AttachmentMeta {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  linkedEntityType: string;
  linkedEntityId?: string | null;
  occurredAt: string;
  dataBase64?: string;
  notes?: string;
  createdAt: string;
}

export interface PeriodClosing {
  id: string;
  periodType: 'day' | 'month';
  periodEnd: string;
  isLocked: boolean;
  closingBalanceSnapshot: number;
  totalIncomeSnapshot: number;
  totalExpenseSnapshot: number;
  notes?: string;
  closedAt: string;
}

export interface AppSettings {
  defaultCurrency: string;
  userName: string;
  organizationName?: string;
  lastBackupAt?: string | null;
  schemaVersion: number;
  createdAt: string;
}

export interface LedgerSnapshot {
  settings: AppSettings;
  uiPreferences: {
    navOrder: ModuleId[];
    reducedMotion: boolean;
  };
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  projects: Project[];
  tasks: DailyTask[];
  workers: Worker[];
  workerRecords: WorkerRecord[];
  suppliers: Supplier[];
  purchases: PurchaseInvoice[];
  inventoryItems: InventoryItem[];
  stockMovements: StockMovement[];
  assets: AssetItem[];
  budgets: CategoryBudget[];
  attachments: AttachmentMeta[];
  periodClosings: PeriodClosing[];
  processedSubmissionIds?: string[];
}
