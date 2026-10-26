import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toMinorUnits,
  fromMinorUnits,
  createEmptyState,
  addAccount,
  updateAccount,
  deleteAccount,
  addTransaction,
  updateTransaction,
  voidTransaction,
  deleteTransaction,
  addCategory,
  computeCategoryBreakdown,
  addSavingsGoal,
  contributeToSavingsGoal,
  addProject,
  addTask,
  toggleTaskCompletion,
  addWorker,
  recordWorkerOperation,
  addSupplier,
  addPurchaseInvoice,
  addInventoryItem,
  recordStockMovement,
  addAsset,
  setCategoryBudget,
  closeFinancialPeriod,
  computeSummary,
  exportSnapshotJson,
  importSnapshotJson,
  updateNavigationOrder,
} from '../src/services/ledgerCore.mjs';

test('1. Zero Fake Financial Records Policy: initial state has 0 accounts, 0 transactions, 0 balances, and 0 assets', () => {
  const state = createEmptyState('EGP');
  assert.equal(state.accounts.length, 0);
  assert.equal(state.transactions.length, 0);
  assert.equal(state.projects.length, 0);
  assert.equal(state.workers.length, 0);
  assert.equal(state.suppliers.length, 0);
  const summary = computeSummary(state);
  assert.equal(summary.totalAccountBalances, 0);
  assert.equal(summary.totalIncome, 0);
  assert.equal(summary.totalExpense, 0);
  assert.equal(summary.netCashMovement, 0);
  assert.equal(summary.totalAssetsValuation, 0);
});

test('2. Integer Minor Units & Rounding Precision: avoids floating point drift (0.1 + 0.2 === 0.30)', () => {
  assert.equal(toMinorUnits(0.1) + toMinorUnits(0.2), 30);
  assert.equal(fromMinorUnits(toMinorUnits(0.1) + toMinorUnits(0.2)), 0.3);
  assert.equal(toMinorUnits('199.995'), 20000);
  assert.throws(() => toMinorUnits('abc'), /غير صالحة/);
  assert.throws(() => toMinorUnits(''), /مطلوبة/);
  assert.throws(() => toMinorUnits(100_000_000_000), /الحد الأقصى/);
});

test('3. Account Creation, Validation & Negative Opening Balance Rejection', () => {
  let state = createEmptyState('EGP');
  assert.throws(() => addAccount(state, { name: '  ', type: 'cash' }), /اسم الحساب مطلوب/);
  assert.throws(() => addAccount(state, { name: 'خزينة', type: 'cash', initialBalance: -50 }), /لا يمكن أن يكون بالسالب/);

  state = addAccount(state, {
    id: 'acc_main',
    name: 'الخزينة الرئيسية',
    type: 'cash',
    initialBalance: 2500.75,
  });
  assert.equal(state.accounts[0].currentBalance, 2500.75);

  state = updateAccount(state, 'acc_main', { initialBalance: 3000.0 });
  assert.equal(state.accounts[0].currentBalance, 3000.0);
});

test('4. Transfers & Separate Transfer Fees: principal never becomes income/expense; fee is recorded as expense', () => {
  let state = createEmptyState('EGP');
  state = addAccount(state, { id: 'acc_bank', name: 'البنك التجاري', type: 'bank', initialBalance: 10000 });
  state = addAccount(state, { id: 'acc_wallet', name: 'محفظة إلكترونية', type: 'wallet', initialBalance: 500 });

  // Transfer 2000 with 15 EGP transfer fee
  state = addTransaction(state, {
    id: 'tx_tr_1',
    accountId: 'acc_bank',
    toAccountId: 'acc_wallet',
    type: 'transfer',
    amount: 2000,
    feeAmount: 15,
    occurredAt: '2026-10-20',
    note: 'تحويل للمحفظة برسوم',
  });

  const bank = state.accounts.find((a) => a.id === 'acc_bank');
  const wallet = state.accounts.find((a) => a.id === 'acc_wallet');
  assert.equal(bank.currentBalance, 7985); // 10000 - 2000 - 15
  assert.equal(wallet.currentBalance, 2500); // 500 + 2000

  const summary = computeSummary(state);
  assert.equal(summary.totalIncome, 0); // Principal is NOT income
  assert.equal(summary.totalExpense, 15); // Only the 15 EGP fee is an expense
  assert.equal(summary.totalPrincipalTransferred, 2000);
  assert.equal(summary.totalTransferFees, 15);
  assert.equal(summary.totalAccountBalances, 10485);
});

test('5. Editing & Voiding Transactions: editing does not duplicate effect; voiding removes effect cleanly', () => {
  let state = createEmptyState('EGP');
  state = addAccount(state, { id: 'acc_1', name: 'النقدية', type: 'cash', initialBalance: 5000 });
  state = addTransaction(state, {
    id: 'tx_edit_1',
    accountId: 'acc_1',
    type: 'expense',
    amount: 400,
    occurredAt: '2026-10-21',
  });
  assert.equal(state.accounts[0].currentBalance, 4600);

  // Edit expense from 400 to 650 (must become 4350, not 5000 - 400 - 650)
  state = updateTransaction(state, 'tx_edit_1', { amount: 650 });
  assert.equal(state.accounts[0].currentBalance, 4350);

  // Void the transaction -> balance returns to 5000 while record remains in audit history
  state = voidTransaction(state, 'tx_edit_1', 'فاتورة ملغاة');
  assert.equal(state.accounts[0].currentBalance, 5000);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.transactions[0].isVoided, true);
  assert.equal(computeSummary(state).totalExpense, 0);
});

test('6. Duplicate Submission Guard: rejects repeated tap with same submissionId', () => {
  let state = createEmptyState('EGP');
  state = addAccount(state, { id: 'acc_1', name: 'النقدية', type: 'cash', initialBalance: 1000, submissionId: 'sub_acc_1' });
  assert.throws(
    () => addAccount(state, { name: 'النقدية', type: 'cash', initialBalance: 1000, submissionId: 'sub_acc_1' }),
    /منع التكرار/
  );

  state = addTransaction(state, {
    accountId: 'acc_1',
    type: 'income',
    amount: 500,
    occurredAt: '2026-10-22',
    submissionId: 'sub_tx_99',
  });
  assert.throws(
    () =>
      addTransaction(state, {
        accountId: 'acc_1',
        type: 'income',
        amount: 500,
        occurredAt: '2026-10-22',
        submissionId: 'sub_tx_99',
      }),
    /منع الإرسال المزدوج/
  );
  assert.equal(state.accounts[0].currentBalance, 1500);
});

test('7. Personal Payments on Behalf of Project: tracks project cost & reimbursement without double-counting company cash', () => {
  let state = createEmptyState('EGP');
  state = addAccount(state, { id: 'acc_co', name: 'حساب الشركة', type: 'bank', initialBalance: 10000 });
  state = addProject(state, { id: 'proj_1', name: 'مشروع تشطيب فيلا الشروق', budget: 50000 });

  // Owner pays 1200 EGP out of personal pocket on behalf of proj_1 (no company account deducted)
  state = addTransaction(state, {
    id: 'tx_pers',
    projectId: 'proj_1',
    type: 'expense',
    amount: 1200,
    paidByPersonal: true,
    occurredAt: '2026-10-23',
    note: 'شراء خامات عاجلة من المال الشخصي',
  });

  // Company account balance remains 10000, while project spent & reimbursement due is 1200
  assert.equal(state.accounts[0].currentBalance, 10000);
  assert.equal(state.projects[0].totalSpent, 1200);
  assert.equal(state.projects[0].personalReimbursementDue, 1200);
});

test('8. Suppliers, Credit Purchases & Subsequent Payments: models payable vs cash paid consistently', () => {
  let state = createEmptyState('EGP');
  state = addAccount(state, { id: 'acc_1', name: 'خزينة المشتريات', type: 'cash', initialBalance: 20000 });
  state = addSupplier(state, { id: 'sup_1', name: 'شركة الحديد والأسمنت', openingBalance: 0 });

  // Purchase invoice for 8000 EGP, paying 3000 EGP immediately and leaving 5000 EGP on credit
  state = addPurchaseInvoice(state, {
    id: 'pur_1',
    supplierId: 'sup_1',
    invoiceNo: 'INV-101',
    totalAmount: 8000,
    paidAmount: 3000,
    accountId: 'acc_1',
    occurredAt: '2026-10-24',
  });

  assert.equal(state.accounts[0].currentBalance, 17000); // Only 3000 deducted
  assert.equal(state.suppliers[0].totalBilled, 8000);
  assert.equal(state.suppliers[0].totalPaid, 3000);
  assert.equal(state.suppliers[0].balanceDue, 5000);

  // Subsequent payment of 2000 EGP to supplier
  state = addTransaction(state, {
    accountId: 'acc_1',
    supplierId: 'sup_1',
    type: 'supplier_payment',
    amount: 2000,
    occurredAt: '2026-10-25',
    note: 'دفعة من الحساب المتبقي',
  });

  assert.equal(state.accounts[0].currentBalance, 15000);
  assert.equal(state.suppliers[0].totalPaid, 5000);
  assert.equal(state.suppliers[0].balanceDue, 3000);
});

test('9. Hierarchical Parent/Child Categories: parent rolls up children without double-counting grand total', () => {
  let state = createEmptyState('EGP');
  state = addAccount(state, { id: 'acc_1', name: 'الخزينة', type: 'cash', initialBalance: 5000 });

  // Spend 300 on parent category (cat-exp-root-site) and 700 on child category (cat-exp-materials)
  state = addTransaction(state, {
    accountId: 'acc_1',
    categoryId: 'cat-exp-root-site',
    type: 'expense',
    amount: 300,
    occurredAt: '2026-10-25',
  });
  state = addTransaction(state, {
    accountId: 'acc_1',
    categoryId: 'cat-exp-materials',
    type: 'expense',
    amount: 700,
    occurredAt: '2026-10-25',
  });

  const breakdown = computeCategoryBreakdown(state);
  const parentCat = breakdown.categories.find((c) => c.id === 'cat-exp-root-site');
  const childCat = breakdown.categories.find((c) => c.id === 'cat-exp-materials');

  assert.equal(parentCat.directAmount, 300);
  assert.equal(parentCat.childrenAmount, 700);
  assert.equal(parentCat.totalRollupAmount, 1000);
  assert.equal(childCat.directAmount, 700);
  // Grand total must be 1000, NEVER 1700!
  assert.equal(breakdown.totalCategorizedExpense, 1000);
});

test('10. Workers, Daily Wages, Advances & Payouts: accurately computes remaining payable', () => {
  let state = createEmptyState('EGP');
  state = addAccount(state, { id: 'acc_1', name: 'عهدة الموقع', type: 'cash', initialBalance: 4000 });
  state = addWorker(state, { id: 'wrk_1', name: 'أحمد محمود', role: 'نجار مسلح', dailyRate: 400 });

  // Record 5 days earned wage (2000 EGP)
  state = recordWorkerOperation(state, {
    workerId: 'wrk_1',
    recordType: 'wage',
    amount: 2000,
    occurredAt: '2026-10-24',
  });
  // Give advance of 500 EGP from acc_1
  state = recordWorkerOperation(state, {
    workerId: 'wrk_1',
    recordType: 'advance',
    amount: 500,
    accountId: 'acc_1',
    occurredAt: '2026-10-25',
  });

  assert.equal(state.workers[0].totalEarned, 2000);
  assert.equal(state.workers[0].totalAdvances, 500);
  assert.equal(state.workers[0].remainingPayable, 1500);
  assert.equal(state.accounts[0].currentBalance, 3500);
});

test('11. Inventory, Assets, Savings & Tasks Modules: validates stock limits and separate asset valuation', () => {
  let state = createEmptyState('EGP');
  state = addInventoryItem(state, { id: 'inv_1', name: 'شكارة أسمنت بورتلاندي', quantity: 50, unit: 'شكارة', unitCost: 140 });
  state = recordStockMovement(state, { itemId: 'inv_1', movementType: 'out', quantity: 20, occurredAt: '2026-10-25' });
  assert.equal(state.inventoryItems[0].quantity, 30);
  assert.throws(
    () => recordStockMovement(state, { itemId: 'inv_1', movementType: 'out', quantity: 40, occurredAt: '2026-10-25' }),
    /غير كافية/
  );

  state = addAsset(state, { id: 'ast_1', name: 'سيارة نقل شيفروليه', purchaseValue: 450000, currentValue: 420000 });
  state = addSavingsGoal(state, { id: 'sav_1', title: 'احتياطي طوارئ', targetAmount: 50000, currentAmount: 10000 });
  state = contributeToSavingsGoal(state, 'sav_1', 5000);
  state = addTask(state, { id: 'tsk_1', title: 'مراجعة فواتير الموردين' });
  state = toggleTaskCompletion(state, 'tsk_1');

  const summary = computeSummary(state);
  assert.equal(summary.totalAssetsValuation, 420000);
  assert.equal(summary.totalAccountBalances, 0); // Assets are never conflated with liquid account balances
  assert.equal(summary.totalSavingsAllocated, 15000);
  assert.equal(state.tasks[0].isCompleted, true);
});

test('12. Period Closing Lock & Navigation Preference Separation', () => {
  let state = createEmptyState('EGP');
  state = addAccount(state, { id: 'acc_1', name: 'الخزينة', type: 'cash', initialBalance: 1000 });
  state = closeFinancialPeriod(state, { periodType: 'month', periodEnd: '2026-09-30', notes: 'إقفال شهر سبتمبر' });

  // Attempt to record backdated transaction in closed period -> must throw
  assert.throws(
    () =>
      addTransaction(state, {
        accountId: 'acc_1',
        type: 'expense',
        amount: 100,
        occurredAt: '2026-09-15',
      }),
    /الفترة مقفلة/
  );

  // Reordering navigation never alters financial balances
  state = updateNavigationOrder(state, ['accounts', 'dashboard', 'transactions']);
  assert.deepEqual(state.uiPreferences.navOrder, ['accounts', 'dashboard', 'transactions']);
  assert.equal(state.accounts[0].currentBalance, 1000);
});

test('13. Backup & Restore Round-Trip and Corrupted Backup Rejection', () => {
  let state = createEmptyState('SAR');
  state = addAccount(state, { id: 'acc_sar', name: 'حساب الإنماء', type: 'bank', initialBalance: 12000 });
  state = addTransaction(state, { accountId: 'acc_sar', type: 'expense', amount: 1500.5, occurredAt: '2026-10-25' });

  const backupJson = exportSnapshotJson(state);
  const restored = importSnapshotJson(backupJson);
  assert.equal(restored.settings.defaultCurrency, 'SAR');
  assert.equal(restored.accounts[0].currentBalance, 10499.5);
  assert.ok(restored.settings.lastBackupAt);

  assert.throws(() => importSnapshotJson('not-valid-json{'), /JSON تالف/);
  assert.throws(() => importSnapshotJson('{"accounts": "invalid"}'), /غير مكتمل/);
});

test('14. Integrity guards reject impossible dates, destructive account deletion, and duplicate supplier invoices', () => {
  let state = createEmptyState('EGP');
  state = addAccount(state, { id: 'acc_guard', name: 'الخزينة', type: 'cash', initialBalance: 1000 });
  assert.throws(() => addTransaction(state, { accountId: 'acc_guard', type: 'expense', amount: 10, occurredAt: '2026-02-30' }), /التاريخ المدخل غير صالح/);

  state = addTransaction(state, { accountId: 'acc_guard', type: 'expense', amount: 10, occurredAt: '2026-02-20' });
  assert.throws(() => deleteAccount(state, 'acc_guard'), /لا يمكن حذف حساب مرتبط/);

  state = addSupplier(state, { id: 'sup_guard', name: 'مورد الاختبار' });
  state = addPurchaseInvoice(state, { supplierId: 'sup_guard', invoiceNo: 'INV-UNIQUE', totalAmount: 100, paidAmount: 0, occurredAt: '2026-02-20' });
  assert.throws(() => addPurchaseInvoice(state, { supplierId: 'sup_guard', invoiceNo: 'INV-UNIQUE', totalAmount: 100, paidAmount: 0, occurredAt: '2026-02-20' }), /مسجل مسبقاً/);
});

test('15. Nested category rollups include every descendant while grand totals remain direct-only', () => {
  let state = createEmptyState('EGP');
  state = addAccount(state, { id: 'acc_nested', name: 'الحساب', type: 'cash', initialBalance: 1000 });
  state = addCategory(state, { id: 'cat_child_nested', name: 'فرعي', type: 'expense', parentId: 'cat-exp-root-site' });
  state = addCategory(state, { id: 'cat_grandchild_nested', name: 'فرعي عميق', type: 'expense', parentId: 'cat_child_nested' });
  state = addTransaction(state, { accountId: 'acc_nested', type: 'expense', categoryId: 'cat_grandchild_nested', amount: 125, occurredAt: '2026-10-25' });
  const report = computeCategoryBreakdown(state);
  const root = report.categories.find((category) => category.id === 'cat-exp-root-site');
  const child = report.categories.find((category) => category.id === 'cat_child_nested');
  assert.equal(root.totalRollupAmount, 125);
  assert.equal(child.totalRollupAmount, 125);
  assert.equal(report.totalCategorizedExpense, 125);
});

test('16. Personal transfers separate planned status, principal, and fees', () => {
  let state = createEmptyState('EGP');
  state = addAccount(state, { id: 'acc_person', name: 'الخزينة', type: 'cash', initialBalance: 1000 });
  state = addTransaction(state, {
    id: 'planned_transfer', type: 'person_transfer', accountId: 'acc_person', recipientName: 'أحمد',
    transferStatus: 'planned', transferMethod: 'محفظة', amount: 200, feeAmount: 5, occurredAt: '2026-10-26',
  });
  assert.equal(state.accounts[0].currentBalance, 1000);
  assert.equal(computeSummary(state).totalPrincipalTransferred, 0);

  state = updateTransaction(state, 'planned_transfer', { transferStatus: 'completed' });
  assert.equal(state.accounts[0].currentBalance, 795);
  const summary = computeSummary(state);
  assert.equal(summary.totalPrincipalTransferred, 200);
  assert.equal(summary.totalTransferFees, 5);
  assert.equal(summary.totalExpense, 5);
});
