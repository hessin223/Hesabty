/**
 * Hesabty (حسابتي) Authoritative Financial & Administrative Engine (v1.0.0)
 *
 * Core Financial Principles:
 * 1. Integer Minor Units (Piasters / Halalas = 1/100 of major currency unit) for all internal math.
 *    Rounding Policy: Half-to-even / standard commercial `Math.round((num + Number.EPSILON) * 100)`.
 * 2. Zero Fake Financial Records on initialization: 0 accounts, 0 transactions, 0 balances.
 * 3. Transfers: Principal never counts as income or expense; `feeAmount` (> 0) is deducted from
 *    the source account and counted as an explicit transfer-fee expense.
 * 4. Edits & Voiding: Editing a transaction replaces its effect cleanly; voiding (`isVoided: true`)
 *    marks the record voided for audit trail while completely removing its effect from balances.
 * 5. Personal Payments on Behalf of a Project (`paidByPersonal: true`):
 *    Tracked in project expenses and personal reimbursement liability without deducting from company
 *    cash/bank accounts (or if paid from a specific personal account, never double-counted).
 * 6. Purchases & Supplier Payments: Credit/partial purchases increase supplier balance due;
 *    subsequent supplier payments reduce supplier balance due and deduct from the paying account
 *    without double-counting the purchase expense.
 * 7. Hierarchical Categories: Parent categories roll up child category totals without double-counting.
 * 8. Period Closing: Transactions dated on or before a locked closing date cannot be added, edited, or voided.
 */

export const INITIAL_CATEGORIES = [
  // Parent Income Categories
  { id: 'cat-inc-root-ops', parentId: null, name: 'إيرادات النشاط والمشاريع', type: 'income', code: 'INC-100', isSystem: true },
  { id: 'cat-inc-contract', parentId: 'cat-inc-root-ops', name: 'مستخلصات ودفعات مشاريع', type: 'income', code: 'INC-101', isSystem: true },
  { id: 'cat-inc-sales', parentId: 'cat-inc-root-ops', name: 'مبيعات وتوريدات', type: 'income', code: 'INC-102', isSystem: true },
  { id: 'cat-inc-personal', parentId: null, name: 'الراتب والدخل الشخصي', type: 'income', code: 'INC-200', isSystem: true },
  { id: 'cat-inc-other', parentId: null, name: 'إيرادات أخرى', type: 'income', code: 'INC-300', isSystem: true },

  // Parent Expense Categories
  { id: 'cat-exp-root-site', parentId: null, name: 'مصروفات التشغيل والمواقع', type: 'expense', code: 'EXP-100', isSystem: true },
  { id: 'cat-exp-materials', parentId: 'cat-exp-root-site', name: 'مواد خام ومشتريات موقع', type: 'expense', code: 'EXP-101', isSystem: true },
  { id: 'cat-exp-wages', parentId: 'cat-exp-root-site', name: 'أجور ويوميات العمال', type: 'expense', code: 'EXP-102', isSystem: true },
  { id: 'cat-exp-equipment', parentId: 'cat-exp-root-site', name: 'تشغيل وصيانة المعدات والمركبات', type: 'expense', code: 'EXP-103', isSystem: true },
  { id: 'cat-exp-root-admin', parentId: null, name: 'مصروفات إدارية وشخصية', type: 'expense', code: 'EXP-200', isSystem: true },
  { id: 'cat-exp-housing', parentId: 'cat-exp-root-admin', name: 'إيجار ومرافق وفواتير', type: 'expense', code: 'EXP-201', isSystem: true },
  { id: 'cat-exp-food', parentId: 'cat-exp-root-admin', name: 'إعاشة ومشتريات منزلية', type: 'expense', code: 'EXP-202', isSystem: true },
  { id: 'cat-exp-fees', parentId: 'cat-exp-root-admin', name: 'عمولات ورسوم تحويل بنكي', type: 'expense', code: 'EXP-203', isSystem: true },
  { id: 'cat-exp-general', parentId: null, name: 'مصروفات عامة متنوعة', type: 'expense', code: 'EXP-300', isSystem: true },
];

export const MAX_SAFE_MAJOR_AMOUNT = 9_999_999_999.99; // ~10 Billion major units

/**
 * Converts a major currency number/string into integer minor units (piasters/halalas).
 * Throws an Arabic validation error if the input is NaN, infinite, or exceeds safe bounds.
 */
export function toMinorUnits(value) {
  if (value === null || value === undefined || value === '') {
    throw new Error('القيمة المالية مطلوبة ولا يمكن تركها فارغة');
  }
  if (typeof value === 'boolean') {
    throw new Error('القيمة المالية غير صالحة');
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error('القيمة المالية غير صالحة؛ يرجى إدخال رقم صحيح');
  }
  if (Math.abs(num) > MAX_SAFE_MAJOR_AMOUNT) {
    throw new Error('القيمة المالية تتجاوز الحد الأقصى المسموح به في النظام');
  }
  return Math.round((num + Number.EPSILON) * 100);
}

/**
 * Converts integer minor units back to major decimal representation (exact to 2 decimal places).
 */
export function fromMinorUnits(minor) {
  if (!Number.isFinite(minor)) return 0;
  return Math.round(minor) / 100;
}

export function roundMoney(value) {
  return fromMinorUnits(toMinorUnits(value));
}

export function validateIsoDate(dateStr) {
  const s = String(dateStr || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('صيغة التاريخ غير صالحة (يجب أن تكون YYYY-MM-DD)');
  }
  const d = new Date(s + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) {
    throw new Error('التاريخ المدخل غير صالح');
  }
  return s;
}

/** @param {string} [defaultCurrency] @returns {import('../types/models').LedgerSnapshot} */
export function createEmptyState(defaultCurrency = 'EGP') {
  return {
    settings: {
      defaultCurrency: String(defaultCurrency || 'EGP').trim(),
      userName: '',
      organizationName: '',
      lastBackupAt: null,
      schemaVersion: 3,
      createdAt: new Date().toISOString(),
    },
    uiPreferences: {
      navOrder: [
        'dashboard',
        'accounts',
        'transactions',
        'income_expense',
        'transfers',
        'savings',
        'projects',
        'tasks',
        'workers',
        'purchases',
        'inventory',
        'assets',
        'categories',
        'budgets_reports',
        'attachments',
        'closing',
        'backup',
        'settings',
      ],
      reducedMotion: false,
    },
    accounts: [],
    categories: INITIAL_CATEGORIES.map((c) => ({ ...c })),
    transactions: [],
    savingsGoals: [],
    projects: [],
    tasks: [],
    workers: [],
    workerRecords: [],
    suppliers: [],
    purchases: [],
    warehouses: [],
    inventoryItems: [],
    stockMovements: [],
    assets: [],
    budgets: [],
    attachments: [],
    periodClosings: [],
    processedSubmissionIds: [],
  };
}

/**
 * Checks if a transaction date falls into a locked period closing.
 */
export function assertDateNotClosed(state, dateStr) {
  const validDate = validateIsoDate(dateStr);
  for (const closing of state.periodClosings || []) {
    if (closing.isLocked && validDate <= closing.periodEnd) {
      throw new Error(
        `لا يمكن تسجيل أو تعديل عملية بتاريخ (${validDate}) لأن الفترة مقفلة حتى (${closing.periodEnd})`
      );
    }
  }
}

/**
 * Authoritative deterministic recalculation of all account balances, project ledgers,
 * worker balances, supplier balances, and savings goals from saved records.
 */
export function recalculateLedgerState(state) {
  const accountMinorBalances = new Map();
  for (const acc of state.accounts || []) {
    accountMinorBalances.set(acc.id, toMinorUnits(acc.initialBalance ?? 0));
  }

  // Sort active (non-voided) transactions chronologically
  const activeTransactions = (state.transactions || [])
    .filter((tx) => !tx.isVoided)
    .slice()
    .sort((a, b) => {
      const cmp = String(a.occurredAt).localeCompare(String(b.occurredAt));
      return cmp !== 0 ? cmp : String(a.createdAt).localeCompare(String(b.createdAt));
    });

  for (const tx of activeTransactions) {
    const amountMinor = toMinorUnits(tx.amount);
    const feeMinor = tx.feeAmount ? toMinorUnits(tx.feeAmount) : 0;

    // If a project expense was paid out of personal pocket outside company accounts,
    // it does not deduct from company accounts unless a personal account was explicitly selected.
    if (tx.paidByPersonal && !tx.accountId) {
      continue;
    }

    if (tx.type === 'person_transfer' && tx.transferStatus === 'planned') {
      continue;
    }

    if (tx.type === 'income') {
      if (accountMinorBalances.has(tx.accountId)) {
        accountMinorBalances.set(
          tx.accountId,
          accountMinorBalances.get(tx.accountId) + amountMinor
        );
      }
    } else if (tx.type === 'expense' || tx.type === 'supplier_payment' || tx.type === 'worker_payout') {
      if (accountMinorBalances.has(tx.accountId)) {
        accountMinorBalances.set(
          tx.accountId,
          accountMinorBalances.get(tx.accountId) - amountMinor
        );
      }
    } else if (tx.type === 'transfer') {
      if (accountMinorBalances.has(tx.accountId)) {
        accountMinorBalances.set(
          tx.accountId,
          accountMinorBalances.get(tx.accountId) - amountMinor - feeMinor
        );
      }
      if (tx.toAccountId && accountMinorBalances.has(tx.toAccountId)) {
        accountMinorBalances.set(
          tx.toAccountId,
          accountMinorBalances.get(tx.toAccountId) + amountMinor
        );
      }
    } else if (tx.type === 'person_transfer') {
      if (accountMinorBalances.has(tx.accountId)) {
        accountMinorBalances.set(
          tx.accountId,
          accountMinorBalances.get(tx.accountId) - amountMinor - feeMinor
        );
      }
    }
  }

  const updatedAccounts = (state.accounts || []).map((acc) => ({
    ...acc,
    initialBalance: fromMinorUnits(toMinorUnits(acc.initialBalance ?? 0)),
    currentBalance: fromMinorUnits(accountMinorBalances.get(acc.id) ?? 0),
  }));

  // Recalculate Project Summaries
  const updatedProjects = (state.projects || []).map((proj) => {
    let spentMinor = 0;
    let incomeMinor = 0;
    let personalOwedMinor = 0;

    for (const tx of activeTransactions) {
      if (tx.projectId === proj.id) {
        const amt = toMinorUnits(tx.amount);
        if (tx.type === 'income') {
          incomeMinor += amt;
        } else if (tx.type === 'expense' || tx.type === 'worker_payout') {
          spentMinor += amt;
          if (tx.paidByPersonal && !tx.reimbursed) {
            personalOwedMinor += amt;
          }
        }
      }
    }

    // Also include direct project purchases not yet paid or paid directly
    for (const pur of state.purchases || []) {
      if (!pur.isVoided && pur.projectId === proj.id) {
        spentMinor += toMinorUnits(pur.totalAmount);
      }
    }

    return {
      ...proj,
      budget: fromMinorUnits(toMinorUnits(proj.budget ?? 0)),
      totalSpent: fromMinorUnits(spentMinor),
      totalIncome: fromMinorUnits(incomeMinor),
      personalReimbursementDue: fromMinorUnits(personalOwedMinor),
    };
  });

  // Recalculate Supplier Balances
  const updatedSuppliers = (state.suppliers || []).map((sup) => {
    let billedMinor = toMinorUnits(sup.openingBalance ?? 0);
    let paidMinor = 0;

    for (const pur of state.purchases || []) {
      if (!pur.isVoided && pur.supplierId === sup.id) {
        billedMinor += toMinorUnits(pur.totalAmount);
        paidMinor += toMinorUnits(pur.paidAmount ?? 0);
      }
    }
    for (const tx of activeTransactions) {
      if (tx.type === 'supplier_payment' && tx.supplierId === sup.id) {
        paidMinor += toMinorUnits(tx.amount);
      }
    }

    return {
      ...sup,
      totalBilled: fromMinorUnits(billedMinor),
      totalPaid: fromMinorUnits(paidMinor),
      balanceDue: fromMinorUnits(Math.max(0, billedMinor - paidMinor)),
    };
  });

  // Recalculate Worker Balances (Earned Wages vs Advances & Payouts)
  const updatedWorkers = (state.workers || []).map((w) => {
    let earnedMinor = 0;
    let advancesMinor = 0;
    let paidMinor = 0;

    for (const rec of state.workerRecords || []) {
      if (rec.workerId === w.id) {
        if (rec.recordType === 'wage') {
          earnedMinor += toMinorUnits(rec.amount);
        } else if (rec.recordType === 'advance') {
          advancesMinor += toMinorUnits(rec.amount);
        } else if (rec.recordType === 'payout') {
          paidMinor += toMinorUnits(rec.amount);
        }
      }
    }

    return {
      ...w,
      dailyRate: fromMinorUnits(toMinorUnits(w.dailyRate ?? 0)),
      totalEarned: fromMinorUnits(earnedMinor),
      totalAdvances: fromMinorUnits(advancesMinor),
      totalPaid: fromMinorUnits(paidMinor),
      remainingPayable: fromMinorUnits(earnedMinor - advancesMinor - paidMinor),
    };
  });

  return {
    ...state,
    accounts: updatedAccounts,
    projects: updatedProjects,
    suppliers: updatedSuppliers,
    workers: updatedWorkers,
  };
}

// ============================================================================
// 1. ACCOUNTS
// ============================================================================

export function addAccount(state, input) {
  if (input.submissionId && (state.processedSubmissionIds || []).includes(input.submissionId)) {
    throw new Error('تم إرسال هذا النموذج مسبقاً (منع التكرار)');
  }
  const name = String(input.name ?? '').trim();
  if (!name) {
    throw new Error('اسم الحساب مطلوب');
  }
  const allowedTypes = ['cash', 'bank', 'wallet', 'savings'];
  if (!allowedTypes.includes(input.type || 'cash')) {
    throw new Error('نوع الحساب غير صالح');
  }
  const initialMinor = toMinorUnits(input.initialBalance ?? 0);
  if (initialMinor < 0) {
    throw new Error('الرصيد الافتتاحي لا يمكن أن يكون بالسالب');
  }
  const currency = String(input.currency || state.settings.defaultCurrency || 'EGP').trim();
  const now = new Date().toISOString();
  const id = input.id || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const newAccount = {
    id,
    name,
    type: input.type || 'cash',
    currency,
    initialBalance: fromMinorUnits(initialMinor),
    currentBalance: fromMinorUnits(initialMinor),
    accountNumber: String(input.accountNumber || '').trim(),
    notes: String(input.notes || '').trim(),
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  const nextIds = input.submissionId
    ? [...(state.processedSubmissionIds || []), input.submissionId]
    : state.processedSubmissionIds || [];

  return recalculateLedgerState({
    ...state,
    accounts: [...state.accounts, newAccount],
    processedSubmissionIds: nextIds,
  });
}

export function updateAccount(state, accountId, patch) {
  const idx = state.accounts.findIndex((a) => a.id === accountId);
  if (idx === -1) throw new Error('الحساب غير موجود');

  const current = state.accounts[idx];
  const name = patch.name !== undefined ? String(patch.name).trim() : current.name;
  if (!name) throw new Error('اسم الحساب مطلوب');

  const initialMinor =
    patch.initialBalance !== undefined
      ? toMinorUnits(patch.initialBalance)
      : toMinorUnits(current.initialBalance);
  if (initialMinor < 0) throw new Error('الرصيد الافتتاحي لا يمكن أن يكون بالسالب');

  const updated = {
    ...current,
    ...patch,
    name,
    initialBalance: fromMinorUnits(initialMinor),
    updatedAt: new Date().toISOString(),
  };

  const nextAccounts = [...state.accounts];
  nextAccounts[idx] = updated;

  return recalculateLedgerState({
    ...state,
    accounts: nextAccounts,
  });
}

export function deleteAccount(state, accountId) {
  const exists = state.accounts.some((a) => a.id === accountId);
  if (!exists) throw new Error('الحساب غير موجود');

  const hasActiveTx = state.transactions.some(
    (t) => !t.isVoided && (t.accountId === accountId || t.toAccountId === accountId)
  );
  if (hasActiveTx) {
    throw new Error('لا يمكن حذف حساب مرتبط بعمليات مالية. أرشفه أو ألغِ العمليات المرتبطة أولاً');
  }

  return recalculateLedgerState({
    ...state,
    accounts: state.accounts.filter((a) => a.id !== accountId),
  });
}

// ============================================================================
// 2. TRANSACTIONS, INCOME/EXPENSE & TRANSFERS
// ============================================================================

export function addTransaction(state, input) {
  if (input.submissionId && (state.processedSubmissionIds || []).includes(input.submissionId)) {
    throw new Error('تم حفظ هذه العملية مسبقاً (منع الإرسال المزدوج)');
  }

  const allowedTypes = ['income', 'expense', 'transfer', 'person_transfer', 'supplier_payment', 'worker_payout'];
  if (!allowedTypes.includes(input.type)) {
    throw new Error('نوع العملية المالية غير صالح');
  }

  const occurredAt = validateIsoDate(input.occurredAt || new Date().toISOString().slice(0, 10));
  assertDateNotClosed(state, occurredAt);

  const amountMinor = toMinorUnits(input.amount);
  if (amountMinor <= 0) {
    throw new Error('يجب أن يكون المبلغ أكبر من الصفر');
  }

  const feeMinor = input.feeAmount !== undefined && input.feeAmount !== ''
    ? toMinorUnits(input.feeAmount)
    : 0;
  if (feeMinor < 0) {
    throw new Error('رسوم التحويل لا يمكن أن تكون بالسالب');
  }

  const paidByPersonal = Boolean(input.paidByPersonal);

  if (paidByPersonal && input.type !== 'expense') {
    throw new Error('الدفع الشخصي متاح للمصروفات فقط');
  }

  if (!paidByPersonal || input.accountId) {
    const account = state.accounts.find((a) => a.id === input.accountId);
    if (!account) {
      throw new Error('يرجى اختيار حساب مالي صالح');
    }
  }

  if (input.type === 'transfer') {
    if (!input.toAccountId || input.toAccountId === input.accountId) {
      throw new Error('يرجى اختيار حساب مستلم مختلف لإتمام التحويل');
    }
    const targetAcc = state.accounts.find((a) => a.id === input.toAccountId);
    if (!targetAcc) {
      throw new Error('الحساب المستلم غير موجود');
    }
  }

  if (input.type === 'person_transfer') {
    if (!String(input.recipientName || '').trim()) {
      throw new Error('اسم مستلم التحويل مطلوب');
    }
    if (!['planned', 'completed'].includes(input.transferStatus || 'completed')) {
      throw new Error('حالة التحويل الشخصي غير صالحة');
    }
  }

  const defaultCategoryId =
    input.type === 'income'
      ? 'cat-inc-other'
      : input.type === 'transfer' || input.type === 'person_transfer'
      ? 'cat-exp-fees'
      : 'cat-exp-general';
  const categoryId = input.categoryId || defaultCategoryId;
  const category = state.categories.find((item) => item.id === categoryId);
  if (!category) {
    throw new Error('يرجى اختيار تصنيف صالح');
  }
  if ((input.type === 'income' && category.type !== 'income') || (input.type !== 'income' && category.type !== 'expense')) {
    throw new Error('نوع التصنيف لا يطابق نوع العملية المالية');
  }

  if (input.type === 'supplier_payment') {
    const supplier = state.suppliers.find((item) => item.id === input.supplierId);
    if (!supplier) throw new Error('يرجى اختيار مورد صالح لسداد المستحقات');
    if (amountMinor > toMinorUnits(supplier.balanceDue ?? 0)) {
      throw new Error('لا يمكن أن تتجاوز دفعة المورد الرصيد المستحق');
    }
  }

  const now = new Date().toISOString();
  const id = input.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const newTx = {
    id,
    accountId: input.accountId || null,
    toAccountId: input.type === 'transfer' ? input.toAccountId : null,
    categoryId,
    projectId: input.projectId || null,
    supplierId: input.supplierId || null,
    workerId: input.workerId || null,
    type: input.type,
    amount: fromMinorUnits(amountMinor),
    feeAmount: fromMinorUnits(feeMinor),
    paidByPersonal,
    reimbursed: false,
    referenceNo: String(input.referenceNo || '').trim(),
    recipientName: String(input.recipientName || '').trim(),
    transferStatus: input.type === 'person_transfer' ? input.transferStatus || 'completed' : 'completed',
    transferMethod: String(input.transferMethod || '').trim(),
    purpose: String(input.purpose || '').trim(),
    note: String(input.note ?? '').trim(),
    occurredAt,
    isVoided: false,
    voidReason: '',
    createdAt: now,
    updatedAt: now,
  };

  const nextIds = input.submissionId
    ? [...(state.processedSubmissionIds || []), input.submissionId]
    : state.processedSubmissionIds || [];

  return recalculateLedgerState({
    ...state,
    transactions: [newTx, ...state.transactions],
    processedSubmissionIds: nextIds,
  });
}

export function updateTransaction(state, transactionId, patch) {
  const idx = state.transactions.findIndex((t) => t.id === transactionId);
  if (idx === -1) throw new Error('العملية المالية غير موجودة');

  const existing = state.transactions[idx];
  assertDateNotClosed(state, existing.occurredAt);

  const nextOccurredAt = patch.occurredAt !== undefined
    ? validateIsoDate(patch.occurredAt)
    : existing.occurredAt;
  assertDateNotClosed(state, nextOccurredAt);

  const nextAmountMinor = patch.amount !== undefined
    ? toMinorUnits(patch.amount)
    : toMinorUnits(existing.amount);
  if (nextAmountMinor <= 0) {
    throw new Error('يجب أن يكون المبلغ أكبر من الصفر');
  }

  const nextFeeMinor = patch.feeAmount !== undefined
    ? toMinorUnits(patch.feeAmount)
    : toMinorUnits(existing.feeAmount || 0);
  if (nextFeeMinor < 0) {
    throw new Error('رسوم التحويل لا يمكن أن تكون بالسالب');
  }

  const nextType = patch.type || existing.type;
  const nextAccountId = patch.accountId !== undefined ? patch.accountId : existing.accountId;
  const nextToAccountId = patch.toAccountId !== undefined ? patch.toAccountId : existing.toAccountId;

  if (nextType === 'transfer' && (!nextToAccountId || nextToAccountId === nextAccountId)) {
    throw new Error('يرجى اختيار حساب مستلم مختلف للتحويل');
  }

  if (!['income', 'expense', 'transfer', 'person_transfer', 'supplier_payment', 'worker_payout'].includes(nextType)) {
    throw new Error('نوع العملية المالية غير صالح');
  }
  if (nextType !== 'expense' && patch.paidByPersonal) {
    throw new Error('الدفع الشخصي متاح للمصروفات فقط');
  }
  if (nextType === 'person_transfer') {
    const recipientName = patch.recipientName !== undefined ? patch.recipientName : existing.recipientName;
    const transferStatus = patch.transferStatus !== undefined ? patch.transferStatus : existing.transferStatus || 'completed';
    if (!String(recipientName || '').trim()) throw new Error('اسم مستلم التحويل مطلوب');
    if (!['planned', 'completed'].includes(transferStatus)) throw new Error('حالة التحويل الشخصي غير صالحة');
  }
  if ((!patch.paidByPersonal && !existing.paidByPersonal) || nextAccountId) {
    if (!state.accounts.some((account) => account.id === nextAccountId)) {
      throw new Error('يرجى اختيار حساب مالي صالح');
    }
  }

  const nextCategoryId = patch.categoryId !== undefined ? patch.categoryId : existing.categoryId;
  const nextCategory = state.categories.find((item) => item.id === nextCategoryId);
  if (!nextCategory) throw new Error('يرجى اختيار تصنيف صالح');
  if ((nextType === 'income' && nextCategory.type !== 'income') || (nextType !== 'income' && nextCategory.type !== 'expense')) {
    throw new Error('نوع التصنيف لا يطابق نوع العملية المالية');
  }

  const updatedTx = {
    ...existing,
    ...patch,
    type: nextType,
    accountId: nextAccountId,
    categoryId: nextCategoryId,
    toAccountId: nextType === 'transfer' ? nextToAccountId : null,
    amount: fromMinorUnits(nextAmountMinor),
    feeAmount: fromMinorUnits(nextFeeMinor),
    occurredAt: nextOccurredAt,
    updatedAt: new Date().toISOString(),
  };

  const nextTransactions = [...state.transactions];
  nextTransactions[idx] = updatedTx;

  return recalculateLedgerState({
    ...state,
    transactions: nextTransactions,
  });
}

export function voidTransaction(state, transactionId, reason = 'إلغاء قيد محاسبي') {
  const idx = state.transactions.findIndex((t) => t.id === transactionId);
  if (idx === -1) throw new Error('العملية المالية غير موجودة');

  const existing = state.transactions[idx];
  assertDateNotClosed(state, existing.occurredAt);

  const nextTransactions = [...state.transactions];
  nextTransactions[idx] = {
    ...existing,
    isVoided: true,
    voidReason: String(reason || '').trim(),
    updatedAt: new Date().toISOString(),
  };

  return recalculateLedgerState({
    ...state,
    transactions: nextTransactions,
  });
}

export function deleteTransaction(state, transactionId) {
  const existing = state.transactions.find((t) => t.id === transactionId);
  if (!existing) throw new Error('العملية غير موجودة');
  assertDateNotClosed(state, existing.occurredAt);

  return recalculateLedgerState({
    ...state,
    transactions: state.transactions.filter((t) => t.id !== transactionId),
  });
}

// ============================================================================
// 3. CATEGORIES (HIERARCHICAL PARENT/CHILD WITHOUT DOUBLE COUNTING)
// ============================================================================

export function addCategory(state, input) {
  const name = String(input.name ?? '').trim();
  if (!name) throw new Error('اسم التصنيف مطلوب');
  if (!['income', 'expense'].includes(input.type)) {
    throw new Error('نوع التصنيف غير صالح');
  }
  const parentId = input.parentId || null;
  if (parentId) {
    const parent = state.categories.find((c) => c.id === parentId);
    if (!parent) throw new Error('التصنيف الرئيسي غير موجود');
    if (parent.type !== input.type) {
      throw new Error('يجب أن يطابق التصنيف الفرعي نوع التصنيف الرئيسي');
    }
  }

  const id = input.id || `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newCat = {
    id,
    parentId,
    name,
    type: input.type,
    code: String(input.code || '').trim(),
    isSystem: false,
  };

  return {
    ...state,
    categories: [...state.categories, newCat],
  };
}

/**
 * Computes category totals ensuring parent categories aggregate their direct transactions
 * PLUS child transactions for reporting rollup, while overall ledger totals NEVER double-count
 * parent + child together.
 */
/**
 * @param {import('../types/models').LedgerSnapshot} state
 * @param {string | null} [periodStart]
 * @param {string | null} [periodEnd]
 */
export function computeCategoryBreakdown(state, periodStart = null, periodEnd = null) {
  const directMinorByCat = new Map();
  for (const c of state.categories) {
    directMinorByCat.set(c.id, 0);
  }

  for (const tx of state.transactions) {
    if (tx.isVoided) continue;
    if (periodStart && tx.occurredAt < periodStart) continue;
    if (periodEnd && tx.occurredAt > periodEnd) continue;

    if (tx.type === 'income' || tx.type === 'expense') {
      const prev = directMinorByCat.get(tx.categoryId) || 0;
      directMinorByCat.set(tx.categoryId, prev + toMinorUnits(tx.amount));
    }
    if (tx.type === 'transfer' && tx.feeAmount > 0) {
      const feeCatId = 'cat-exp-fees';
      const prev = directMinorByCat.get(feeCatId) || 0;
      directMinorByCat.set(feeCatId, prev + toMinorUnits(tx.feeAmount));
    }
  }

  const totalWithDescendants = (categoryId, visited = new Set()) => {
    if (visited.has(categoryId)) return 0;
    const nextVisited = new Set(visited);
    nextVisited.add(categoryId);
    return (directMinorByCat.get(categoryId) || 0) + state.categories
      .filter((child) => child.parentId === categoryId)
      .reduce((sum, child) => sum + totalWithDescendants(child.id, nextVisited), 0);
  };

  // Rollup for each category (direct + all descendants)
  const results = state.categories.map((cat) => {
    const directMinor = directMinorByCat.get(cat.id) || 0;
    const rollupMinor = totalWithDescendants(cat.id);
    const childrenMinor = rollupMinor - directMinor;
    return {
      ...cat,
      directAmount: fromMinorUnits(directMinor),
      childrenAmount: fromMinorUnits(childrenMinor),
      totalRollupAmount: fromMinorUnits(rollupMinor),
    };
  });

  // Grand total across all categories of a type is strictly the sum of `directAmount` (no double counting!)
  const totalCategorizedIncome = fromMinorUnits(
    state.categories
      .filter((c) => c.type === 'income')
      .reduce((s, c) => s + (directMinorByCat.get(c.id) || 0), 0)
  );
  const totalCategorizedExpense = fromMinorUnits(
    state.categories
      .filter((c) => c.type === 'expense')
      .reduce((s, c) => s + (directMinorByCat.get(c.id) || 0), 0)
  );

  return {
    categories: results,
    totalCategorizedIncome,
    totalCategorizedExpense,
  };
}

// ============================================================================
// 4. SAVINGS & PERSONAL FUNDS (التحويشة والأموال الشخصية)
// ============================================================================

export function addSavingsGoal(state, input) {
  const title = String(input.title ?? '').trim();
  if (!title) throw new Error('عنوان هدف الادخار مطلوب');
  const targetMinor = toMinorUnits(input.targetAmount);
  if (targetMinor <= 0) throw new Error('المبلغ المستهدف يجب أن يكون أكبر من الصفر');
  const currentMinor = toMinorUnits(input.currentAmount ?? 0);
  if (currentMinor < 0) throw new Error('المبلغ المدخر الحالي لا يمكن أن يكون بالسالب');

  const goal = {
    id: input.id || `sav_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    targetAmount: fromMinorUnits(targetMinor),
    currentAmount: fromMinorUnits(currentMinor),
    linkedAccountId: input.linkedAccountId || null,
    targetDate: input.targetDate || null,
    notes: String(input.notes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    savingsGoals: [...(state.savingsGoals || []), goal],
  };
}

export function contributeToSavingsGoal(state, goalId, deltaAmount) {
  const idx = (state.savingsGoals || []).findIndex((g) => g.id === goalId);
  if (idx === -1) throw new Error('هدف الادخار غير موجود');
  const deltaMinor = toMinorUnits(deltaAmount);
  const current = state.savingsGoals[idx];
  const nextMinor = toMinorUnits(current.currentAmount) + deltaMinor;
  if (nextMinor < 0) throw new Error('لا يمكن أن يصبح رصيد التحويشة بالسالب');

  const nextGoals = [...state.savingsGoals];
  nextGoals[idx] = {
    ...current,
    currentAmount: fromMinorUnits(nextMinor),
  };
  return { ...state, savingsGoals: nextGoals };
}

// ============================================================================
// 5. PROJECTS & DAILY TASKS (المشاريع ومواقع العمل والمهام اليومية)
// ============================================================================

export function addProject(state, input) {
  const name = String(input.name ?? '').trim();
  if (!name) throw new Error('اسم المشروع أو موقع العمل مطلوب');
  const budgetMinor = toMinorUnits(input.budget ?? 0);
  if (budgetMinor < 0) throw new Error('ميزانية المشروع لا يمكن أن تكون بالسالب');

  const proj = {
    id: input.id || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    clientName: String(input.clientName || '').trim(),
    location: String(input.location || '').trim(),
    status: input.status || 'active', // 'active' | 'completed' | 'on_hold'
    budget: fromMinorUnits(budgetMinor),
    totalSpent: 0,
    totalIncome: 0,
    personalReimbursementDue: 0,
    startDate: input.startDate || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
  };

  return recalculateLedgerState({
    ...state,
    projects: [...(state.projects || []), proj],
  });
}

export function addTask(state, input) {
  const title = String(input.title ?? '').trim();
  if (!title) throw new Error('عنوان المهمة مطلوب');
  const task = {
    id: input.id || `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    projectId: input.projectId || null,
    dueDate: input.dueDate || new Date().toISOString().slice(0, 10),
    priority: input.priority || 'normal', // 'high' | 'normal' | 'low'
    isCompleted: false,
    notes: String(input.notes || '').trim(),
    createdAt: new Date().toISOString(),
  };
  return {
    ...state,
    tasks: [task, ...(state.tasks || [])],
  };
}

export function toggleTaskCompletion(state, taskId) {
  const idx = (state.tasks || []).findIndex((t) => t.id === taskId);
  if (idx === -1) throw new Error('المهمة غير موجودة');
  const next = [...state.tasks];
  next[idx] = { ...next[idx], isCompleted: !next[idx].isCompleted };
  return { ...state, tasks: next };
}

// ============================================================================
// 6. WORKERS, WAGES & ADVANCES (العمال والأجور والسلف)
// ============================================================================

export function addWorker(state, input) {
  const name = String(input.name ?? '').trim();
  if (!name) throw new Error('اسم العامل مطلوب');
  const rateMinor = toMinorUnits(input.dailyRate ?? 0);
  if (rateMinor < 0) throw new Error('الأجر اليومي لا يمكن أن يكون بالسالب');

  const worker = {
    id: input.id || `wrk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    role: String(input.role || 'فني / عامل').trim(),
    phone: String(input.phone || '').trim(),
    projectId: input.projectId || null,
    dailyRate: fromMinorUnits(rateMinor),
    totalEarned: 0,
    totalAdvances: 0,
    totalPaid: 0,
    remainingPayable: 0,
    createdAt: new Date().toISOString(),
  };

  return recalculateLedgerState({
    ...state,
    workers: [...(state.workers || []), worker],
  });
}

export function recordWorkerOperation(state, input) {
  const worker = (state.workers || []).find((w) => w.id === input.workerId);
  if (!worker) throw new Error('العامل غير موجود');
  if (!['wage', 'advance', 'payout'].includes(input.recordType)) {
    throw new Error('نوع حركة العامل غير صالح');
  }
  const amountMinor = toMinorUnits(input.amount);
  if (amountMinor <= 0) throw new Error('المبلغ يجب أن يكون أكبر من الصفر');
  const occurredAt = validateIsoDate(input.occurredAt || new Date().toISOString().slice(0, 10));
  assertDateNotClosed(state, occurredAt);

  const rec = {
    id: input.id || `wrec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    workerId: worker.id,
    projectId: input.projectId || worker.projectId || null,
    recordType: input.recordType, // 'wage' (استحقاق يومية) | 'advance' (سلفة) | 'payout' (صرف أجر)
    amount: fromMinorUnits(amountMinor),
    accountId: input.accountId || null,
    occurredAt,
    note: String(input.note || '').trim(),
    createdAt: new Date().toISOString(),
  };

  let nextState = {
    ...state,
    workerRecords: [rec, ...(state.workerRecords || [])],
  };

  // If advance or payout is paid from a financial account, atomically record the cash outflow
  if ((input.recordType === 'advance' || input.recordType === 'payout') && input.accountId) {
    nextState = addTransaction(nextState, {
      accountId: input.accountId,
      projectId: rec.projectId,
      workerId: worker.id,
      categoryId: 'cat-exp-wages',
      type: 'worker_payout',
      amount: rec.amount,
      occurredAt,
      note: `${input.recordType === 'advance' ? 'سلفة عامل' : 'صرف أجور'}: ${worker.name} ${rec.note ? '- ' + rec.note : ''}`,
    });
  }

  return recalculateLedgerState(nextState);
}

// ============================================================================
// 7. PURCHASES & SUPPLIERS (المشتريات والموردون)
// ============================================================================

export function addSupplier(state, input) {
  const name = String(input.name ?? '').trim();
  if (!name) throw new Error('اسم المورد مطلوب');
  const openingMinor = toMinorUnits(input.openingBalance ?? 0);
  if (openingMinor < 0) throw new Error('الرصيد الافتتاحي للمورد لا يمكن أن يكون بالسالب');

  const supplier = {
    id: input.id || `sup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    phone: String(input.phone || '').trim(),
    specialty: String(input.specialty || '').trim(),
    openingBalance: fromMinorUnits(openingMinor),
    totalBilled: fromMinorUnits(openingMinor),
    totalPaid: 0,
    balanceDue: fromMinorUnits(openingMinor),
    createdAt: new Date().toISOString(),
  };

  return recalculateLedgerState({
    ...state,
    suppliers: [...(state.suppliers || []), supplier],
  });
}

export function addPurchaseInvoice(state, input) {
  const supplier = (state.suppliers || []).find((s) => s.id === input.supplierId);
  if (!supplier) throw new Error('يرجى اختيار مورد صالح');

  const totalMinor = toMinorUnits(input.totalAmount);
  if (totalMinor <= 0) throw new Error('إجمالي الفاتورة يجب أن يكون أكبر من الصفر');

  const paidMinor = toMinorUnits(input.paidAmount ?? 0);
  if (paidMinor < 0 || paidMinor > totalMinor) {
    throw new Error('المبلغ المدفوع يجب أن يكون بين الصفر وإجمالي الفاتورة');
  }

  const occurredAt = validateIsoDate(input.occurredAt || new Date().toISOString().slice(0, 10));
  assertDateNotClosed(state, occurredAt);

  if (paidMinor > 0 && !input.accountId) {
    throw new Error('يرجى تحديد الحساب المالي الذي تم سداد الدفعة منه');
  }

  const invoiceNo = String(input.invoiceNo || '').trim();
  if (invoiceNo && (state.purchases || []).some((purchase) => !purchase.isVoided && purchase.supplierId === supplier.id && purchase.invoiceNo === invoiceNo)) {
    throw new Error('رقم فاتورة المورد مسجل مسبقاً');
  }

  const invoice = {
    id: input.id || `pur_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    supplierId: supplier.id,
    projectId: input.projectId || null,
    invoiceNo,
    totalAmount: fromMinorUnits(totalMinor),
    paidAmount: fromMinorUnits(paidMinor),
    remainingAmount: fromMinorUnits(totalMinor - paidMinor),
    accountId: input.accountId || null,
    occurredAt,
    note: String(input.note || '').trim(),
    isVoided: false,
    createdAt: new Date().toISOString(),
  };

  let nextState = {
    ...state,
    purchases: [invoice, ...(state.purchases || [])],
  };

  // If an immediate payment was made on the invoice, deduct only the paid portion from the account
  if (paidMinor > 0 && input.accountId) {
    nextState = addTransaction(nextState, {
      accountId: input.accountId,
      // The invoice itself is the project expense record; the payment is cash settlement.
      projectId: null,
      supplierId: supplier.id,
      categoryId: 'cat-exp-materials',
      type: 'expense',
      amount: fromMinorUnits(paidMinor),
      occurredAt,
      note: `دفعة فاتورة مشتريات (${supplier.name}) ${invoice.invoiceNo}`,
    });
  }

  return recalculateLedgerState(nextState);
}

// ============================================================================
// 8. INVENTORY & WAREHOUSES (المخزون والمستودعات)
// ============================================================================

export function addInventoryItem(state, input) {
  const name = String(input.name ?? '').trim();
  if (!name) throw new Error('اسم الصنف المخزني مطلوب');
  const qty = Number(input.quantity ?? 0);
  if (!Number.isFinite(qty) || qty < 0) throw new Error('الكمية الافتتاحية غير صالحة');
  const unitCostMinor = toMinorUnits(input.unitCost ?? 0);
  if (unitCostMinor < 0) throw new Error('تكلفة الوحدة لا يمكن أن تكون بالسالب');

  const minQuantity = Number(input.minQuantity ?? 0);
  if (!Number.isFinite(minQuantity) || minQuantity < 0) throw new Error('حد تنبيه المخزون غير صالح');

  const item = {
    id: input.id || `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    sku: String(input.sku || '').trim(),
    warehouseName: String(input.warehouseName || 'المستودع الرئيسي').trim(),
    unit: String(input.unit || 'وحدة').trim(),
    quantity: qty,
    minQuantity,
    unitCost: fromMinorUnits(unitCostMinor),
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    inventoryItems: [...(state.inventoryItems || []), item],
  };
}

export function recordStockMovement(state, input) {
  const idx = (state.inventoryItems || []).findIndex((i) => i.id === input.itemId);
  if (idx === -1) throw new Error('الصنف المخزني غير موجود');
  const qty = Number(input.quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw new Error('كمية الحركة يجب أن تكون أكبر من الصفر');
  if (!['in', 'out'].includes(input.movementType)) throw new Error('نوع حركة المخزون غير صالح');

  const item = state.inventoryItems[idx];
  const nextQty = input.movementType === 'in' ? item.quantity + qty : item.quantity - qty;
  if (nextQty < 0) {
    throw new Error(`الكمية المتاحة في المخزون (${item.quantity}) غير كافية للصرف`);
  }

  const nextItems = [...state.inventoryItems];
  nextItems[idx] = { ...item, quantity: nextQty };

  const movement = {
    id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    itemId: item.id,
    projectId: input.projectId || null,
    movementType: input.movementType,
    quantity: qty,
    occurredAt: validateIsoDate(input.occurredAt || new Date().toISOString().slice(0, 10)),
    note: String(input.note || '').trim(),
  };

  return {
    ...state,
    inventoryItems: nextItems,
    stockMovements: [movement, ...(state.stockMovements || [])],
  };
}

// ============================================================================
// 9. ASSETS & VEHICLES (الأصول والمركبات)
// ============================================================================

export function addAsset(state, input) {
  const name = String(input.name ?? '').trim();
  if (!name) throw new Error('اسم الأصل أو المركبة مطلوب');
  const valueMinor = toMinorUnits(input.purchaseValue ?? 0);
  if (valueMinor < 0) throw new Error('قيمة الأصل لا يمكن أن تكون بالسالب');

  const currentValueMinor = toMinorUnits(input.currentValue ?? input.purchaseValue ?? 0);
  if (currentValueMinor < 0) throw new Error('القيمة الحالية للأصل لا يمكن أن تكون بالسالب');

  const asset = {
    id: input.id || `ast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    assetType: input.assetType || 'vehicle', // 'vehicle' | 'equipment' | 'property'
    plateOrSerial: String(input.plateOrSerial || '').trim(),
    purchaseValue: fromMinorUnits(valueMinor),
    currentValue: fromMinorUnits(currentValueMinor),
    status: input.status || 'operational',
    projectId: input.projectId || null,
    notes: String(input.notes || '').trim(),
    createdAt: new Date().toISOString(),
  };

  return {
    ...state,
    assets: [...(state.assets || []), asset],
  };
}

// ============================================================================
// 10. BUDGETS, ATTACHMENTS & PERIOD CLOSING (الميزانيات والمرفقات وإقفال الفترات)
// ============================================================================

export function setCategoryBudget(state, input) {
  const category = state.categories.find((c) => c.id === input.categoryId);
  if (!category) throw new Error('يرجى اختيار تصنيف صالح للميزانية');
  const limitMinor = toMinorUnits(input.monthlyLimit);
  if (limitMinor <= 0) throw new Error('حد الميزانية يجب أن يكون أكبر من الصفر');

  const existingIdx = (state.budgets || []).findIndex((b) => b.categoryId === category.id);
  const budgetObj = {
    id: existingIdx >= 0 ? state.budgets[existingIdx].id : `bdg_${Date.now()}`,
    categoryId: category.id,
    monthlyLimit: fromMinorUnits(limitMinor),
    updatedAt: new Date().toISOString(),
  };

  const nextBudgets = [...(state.budgets || [])];
  if (existingIdx >= 0) {
    nextBudgets[existingIdx] = budgetObj;
  } else {
    nextBudgets.push(budgetObj);
  }

  return { ...state, budgets: nextBudgets };
}

export function addAttachmentMetadata(state, input) {
  const title = String(input.title ?? '').trim();
  if (!title) throw new Error('عنوان المستند أو المرفق مطلوب');
  const att = {
    id: input.id || `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    fileName: String(input.fileName || 'document.pdf').trim(),
    mimeType: String(input.mimeType || 'application/pdf').trim(),
    sizeBytes: Number(input.sizeBytes || 0),
    linkedEntityType: input.linkedEntityType || 'transaction',
    linkedEntityId: input.linkedEntityId || null,
    occurredAt: validateIsoDate(input.occurredAt || new Date().toISOString().slice(0, 10)),
    notes: String(input.notes || '').trim(),
    dataBase64: String(input.dataBase64 || ''),
    createdAt: new Date().toISOString(),
  };
  return {
    ...state,
    attachments: [att, ...(state.attachments || [])],
  };
}

export function closeFinancialPeriod(state, input) {
  const periodEnd = validateIsoDate(input.periodEnd);
  const summary = computeSummary(state, null, periodEnd);

  const closing = {
    id: input.id || `cls_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    periodType: input.periodType || 'month', // 'day' | 'month'
    periodEnd,
    isLocked: true,
    closingBalanceSnapshot: summary.totalAccountBalances,
    totalIncomeSnapshot: summary.totalIncome,
    totalExpenseSnapshot: summary.totalExpense,
    notes: String(input.notes || '').trim(),
    closedAt: new Date().toISOString(),
  };

  return {
    ...state,
    periodClosings: [closing, ...(state.periodClosings || [])],
  };
}

// ============================================================================
// 11. DASHBOARD & EXECUTIVE SUMMARY (SEPARATE METRICS — NO CONFLATION)
// ============================================================================

/**
 * Computes strictly separated financial metrics:
 * - `totalAccountBalances`: Sum of actual liquid balances across active accounts.
 * - `totalIncome`: Sum of non-voided income transactions in the selected period (excludes transfers).
 * - `totalExpense`: Sum of non-voided expenses + transfer fees + supplier/worker cash payouts in the period.
 * - `netCashMovement`: `totalIncome - totalExpense` in the selected period.
 * - `totalPrincipalTransferred`: Sum of principal transferred between accounts (never mixed with income/expense).
 * - `totalAssetsValuation`: Valuation of physical assets/vehicles (kept distinct from liquid account balances).
 * - `totalPersonalReimbursementDue`: Personal payments on behalf of projects awaiting reimbursement.
 */
/**
 * @param {import('../types/models').LedgerSnapshot} state
 * @param {string | null} [periodStart]
 * @param {string | null} [periodEnd]
 */
export function computeSummary(state, periodStart = null, periodEnd = null) {
  const totalAccountMinor = (state.accounts || []).reduce(
    (sum, acc) => sum + toMinorUnits(acc.currentBalance ?? 0),
    0
  );

  let incomeMinor = 0;
  let expenseMinor = 0;
  let transferPrincipalMinor = 0;
  let transferFeesMinor = 0;

  for (const tx of state.transactions || []) {
    if (tx.isVoided) continue;
    if (periodStart && tx.occurredAt < periodStart) continue;
    if (periodEnd && tx.occurredAt > periodEnd) continue;

    const amtMinor = toMinorUnits(tx.amount);
    const feeMinor = tx.feeAmount ? toMinorUnits(tx.feeAmount) : 0;

    if (tx.type === 'income') {
      incomeMinor += amtMinor;
    } else if (tx.type === 'expense' || tx.type === 'supplier_payment' || tx.type === 'worker_payout') {
      // Only count as cash expense if not an unlinked personal-on-behalf-of-project entry
      if (!tx.paidByPersonal || tx.accountId) {
        expenseMinor += amtMinor;
      }
    } else if (tx.type === 'transfer' || tx.type === 'person_transfer') {
      if (tx.type === 'person_transfer' && tx.transferStatus === 'planned') continue;
      transferPrincipalMinor += amtMinor;
      if (feeMinor > 0) {
        transferFeesMinor += feeMinor;
        expenseMinor += feeMinor;
      }
    }
  }

  const totalAssetsMinor = (state.assets || []).reduce(
    (sum, ast) => sum + toMinorUnits(ast.currentValue ?? 0),
    0
  );

  const totalSavingsMinor = (state.savingsGoals || []).reduce(
    (sum, g) => sum + toMinorUnits(g.currentAmount ?? 0),
    0
  );

  const totalPersonalOwedMinor = (state.projects || []).reduce(
    (sum, p) => sum + toMinorUnits(p.personalReimbursementDue ?? 0),
    0
  );

  return {
    totalBalance: fromMinorUnits(totalAccountMinor),
    totalAccountBalances: fromMinorUnits(totalAccountMinor),
    totalIncome: fromMinorUnits(incomeMinor),
    totalExpense: fromMinorUnits(expenseMinor),
    netCashMovement: fromMinorUnits(incomeMinor - expenseMinor),
    totalPrincipalTransferred: fromMinorUnits(transferPrincipalMinor),
    totalTransferFees: fromMinorUnits(transferFeesMinor),
    totalAssetsValuation: fromMinorUnits(totalAssetsMinor),
    totalSavingsAllocated: fromMinorUnits(totalSavingsMinor),
    totalPersonalReimbursementDue: fromMinorUnits(totalPersonalOwedMinor),
    accountsCount: (state.accounts || []).length,
    transactionsCount: (state.transactions || []).filter((t) => !t.isVoided).length,
  };
}

// ============================================================================
// 12. BACKUP & RESTORE SERIALIZATION WITH STRICT VALIDATION
// ============================================================================

export function exportSnapshotJson(state) {
  const exportPayload = {
    ...state,
    settings: {
      ...state.settings,
      lastBackupAt: new Date().toISOString(),
    },
  };
  return JSON.stringify(exportPayload, null, 2);
}

export function importSnapshotJson(rawJson) {
  if (typeof rawJson !== 'string' || !rawJson.trim()) {
    throw new Error('ملف النسخة الاحتياطية فارغ');
  }
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('ملف النسخة الاحتياطية غير صالح (JSON تالف)');
  }
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !Array.isArray(parsed.accounts) ||
    !Array.isArray(parsed.transactions)
  ) {
    throw new Error('هيكل ملف النسخة الاحتياطية غير مكتمل أو غير متوافق');
  }

  // Validate every account and transaction amount before accepting the restore
  for (const acc of parsed.accounts) {
    if (!acc.id || !acc.name) {
      throw new Error('بيانات الحسابات داخل النسخة الاحتياطية تالفة');
    }
    toMinorUnits(acc.initialBalance ?? 0);
  }
  for (const tx of parsed.transactions) {
    if (!tx.id || !tx.type) {
      throw new Error('بيانات العمليات المالية داخل النسخة الاحتياطية تالفة');
    }
    if (toMinorUnits(tx.amount) <= 0) {
      throw new Error('تحتوي النسخة الاحتياطية على عملية بمبلغ غير صالح');
    }
    validateIsoDate(tx.occurredAt);
  }

  const categories = Array.isArray(parsed.categories) && parsed.categories.length > 0
    ? parsed.categories
    : INITIAL_CATEGORIES;
  const categoryIds = new Set(categories.map((category) => category.id));
  for (const category of categories) {
    if (!category.id || !category.name || !['income', 'expense'].includes(category.type)) {
      throw new Error('بيانات التصنيفات داخل النسخة الاحتياطية تالفة');
    }
    if (category.parentId && (!categoryIds.has(category.parentId) || category.parentId === category.id)) {
      throw new Error('علاقة التصنيفات داخل النسخة الاحتياطية غير صالحة');
    }
  }

  const base = createEmptyState(parsed.settings?.defaultCurrency || 'EGP');
  const merged = {
    ...base,
    ...parsed,
    settings: {
      ...base.settings,
      ...(parsed.settings || {}),
      schemaVersion: 3,
      lastBackupAt: new Date().toISOString(),
    },
    uiPreferences: {
      ...base.uiPreferences,
      ...(parsed.uiPreferences || {}),
    },
    categories,
  };

  return recalculateLedgerState(merged);
}

/**
 * Updates UI navigation preferences without touching or mutating any financial records.
 */
export function updateNavigationOrder(state, newNavOrder) {
  if (!Array.isArray(newNavOrder) || newNavOrder.length === 0) {
    throw new Error('ترتيب القائمة غير صالح');
  }
  return {
    ...state,
    uiPreferences: {
      ...(state.uiPreferences || {}),
      navOrder: [...newNavOrder],
    },
  };
}

export function updateSettings(state, partialSettings) {
  return {
    ...state,
    settings: {
      ...state.settings,
      ...partialSettings,
    },
  };
}
