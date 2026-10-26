import React, { useEffect, useState, useMemo } from 'react';
import { dbInstance } from './db/storageAdapter';
import type { LedgerSnapshot, AccountType, TransactionType, ModuleId } from './types/models';
import {
  createEmptyState,
  addAccount,
  updateAccount,
  deleteAccount,
  addTransaction,
  updateTransaction,
  voidTransaction,
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
  addAttachmentMetadata,
  closeFinancialPeriod,
  computeSummary,
  exportSnapshotJson,
  importSnapshotJson,
  updateNavigationOrder,
  updateSettings,
} from './services/ledgerCore.mjs';

export const MODULE_DEFINITIONS: { id: ModuleId; title: string; group: string }[] = [
  { id: 'dashboard', title: '1. الرئيسية', group: 'الأساسية' },
  { id: 'accounts', title: '2. الحسابات', group: 'الأساسية' },
  { id: 'transactions', title: '3. العمليات المالية', group: 'الأساسية' },
  { id: 'income_expense', title: '4. المصروفات والدخل', group: 'المالية' },
  { id: 'transfers', title: '5. التحويلات', group: 'المالية' },
  { id: 'savings', title: '6. التحويشة والأموال الشخصية', group: 'المالية' },
  { id: 'projects', title: '7. المشاريع ومواقع العمل', group: 'المشاريع والتشغيل' },
  { id: 'tasks', title: '8. المهام اليومية', group: 'المشاريع والتشغيل' },
  { id: 'workers', title: '9. العمال والأجور والسلف', group: 'المشاريع والتشغيل' },
  { id: 'purchases', title: '10. المشتريات والموردون', group: 'الموارد والمخزون' },
  { id: 'inventory', title: '11. المخزون والمستودعات', group: 'الموارد والمخزون' },
  { id: 'assets', title: '12. الأصول والمركبات', group: 'الموارد والمخزون' },
  { id: 'categories', title: '13. التصنيفات', group: 'الرقابة والتقارير' },
  { id: 'budgets_reports', title: '14. الميزانيات والتقارير', group: 'الرقابة والتقارير' },
  { id: 'attachments', title: '15. المرفقات والمستندات', group: 'الرقابة والتقارير' },
  { id: 'closing', title: '16. إقفال اليوم والشهر', group: 'النظام والأمان' },
  { id: 'backup', title: '17. النسخ الاحتياطي والاستعادة', group: 'النظام والأمان' },
  { id: 'settings', title: '18. الإعدادات', group: 'النظام والأمان' },
];

export default function App() {
  const [state, setState] = useState<LedgerSnapshot>(() => createEmptyState());
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Period filter for dashboard
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // Account Form
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('cash');
  const [accInitialBalance, setAccInitialBalance] = useState('0');
  const [accNotes, setAccNotes] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountHistoryId, setAccountHistoryId] = useState<string | null>(null);

  // Transaction / Transfer Form
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [txAccountId, setTxAccountId] = useState('');
  const [txToAccountId, setTxToAccountId] = useState('');
  const [txCategoryId, setTxCategoryId] = useState('cat-exp-materials');
  const [txProjectId, setTxProjectId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txFeeAmount, setTxFeeAmount] = useState('0');
  const [txPaidByPersonal, setTxPaidByPersonal] = useState(false);
  const [txNote, setTxNote] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [personRecipient, setPersonRecipient] = useState('');
  const [personTransferStatus, setPersonTransferStatus] = useState<'planned' | 'completed'>('completed');
  const [personTransferMethod, setPersonTransferMethod] = useState('');
  const [personTransferPurpose, setPersonTransferPurpose] = useState('');
  const [transferMode, setTransferMode] = useState<'internal' | 'person'>('internal');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');

  // Secondary Module Forms
  const [savTitle, setSavTitle] = useState('');
  const [savTarget, setSavTarget] = useState('');
  const [projName, setProjName] = useState('');
  const [projClient, setProjClient] = useState('');
  const [projBudget, setProjBudget] = useState('0');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [taskDueDate, setTaskDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [workerName, setWorkerName] = useState('');
  const [workerRole, setWorkerRole] = useState('');
  const [workerRate, setWorkerRate] = useState('0');
  const [wRecWorkerId, setWRecWorkerId] = useState('');
  const [wRecType, setWRecType] = useState<'wage' | 'advance' | 'payout'>('wage');
  const [wRecAmount, setWRecAmount] = useState('');
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [purSupplierId, setPurSupplierId] = useState('');
  const [purTotal, setPurTotal] = useState('');
  const [purPaid, setPurPaid] = useState('0');
  const [purInvoiceNo, setPurInvoiceNo] = useState('');
  const [invName, setInvName] = useState('');
  const [invQty, setInvQty] = useState('0');
  const [invUnit, setInvUnit] = useState('قطعة');
  const [invCost, setInvCost] = useState('0');
  const [stockItemId, setStockItemId] = useState('');
  const [stockMovementType, setStockMovementType] = useState<'in' | 'out'>('out');
  const [stockMovementQty, setStockMovementQty] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetValue, setAssetValue] = useState('0');
  const [savingGoalId, setSavingGoalId] = useState('');
  const [savingContribution, setSavingContribution] = useState('');
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [catParentId, setCatParentId] = useState('');
  const [budgetCatId, setBudgetCatId] = useState('cat-exp-materials');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [attTitle, setAttTitle] = useState('');
  const [attFileName, setAttFileName] = useState('');
  const [attachmentTxId, setAttachmentTxId] = useState('');
  const [attachmentData, setAttachmentData] = useState('');
  const [closingType, setClosingType] = useState<'day' | 'month'>('day');
  const [closingDate, setClosingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [importJsonText, setImportJsonText] = useState('');
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);

  useEffect(() => {
    dbInstance.initialize().then((loaded) => {
      setState(loaded);
      if (loaded.accounts.length > 0) {
        setTxAccountId(loaded.accounts[0].id);
      }
      setIsLoaded(true);
    });
  }, []);

  const notify = (type: 'success' | 'error', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 4000);
  };

  const persistAndSet = async (nextState: LedgerSnapshot, successMsg: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await dbInstance.saveSnapshot(nextState);
      setState(nextState);
      notify('success', successMsg);
    } catch (err: any) {
      notify('error', err.message || 'تعذر حفظ البيانات في قاعدة البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  const summary = useMemo(
    () => computeSummary(state, periodStart || null, periodEnd || null),
    [state, periodStart, periodEnd]
  );

  const categoryBreakdown = useMemo(
    () => computeCategoryBreakdown(state, periodStart || null, periodEnd || null),
    [state, periodStart, periodEnd]
  );

  const filteredTransactions = useMemo(() => {
    return state.transactions.filter((tx) => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterAccountId !== 'all' && tx.accountId !== filterAccountId && tx.toAccountId !== filterAccountId) return false;
      if (filterCategoryId !== 'all' && tx.categoryId !== filterCategoryId) return false;
      if (periodStart && tx.occurredAt < periodStart) return false;
      if (periodEnd && tx.occurredAt > periodEnd) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const acc = state.accounts.find((a) => a.id === tx.accountId)?.name || '';
        const cat = state.categories.find((c) => c.id === tx.categoryId)?.name || '';
        return (
          tx.note.toLowerCase().includes(q) ||
          acc.toLowerCase().includes(q) ||
          cat.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.transactions, state.accounts, state.categories, filterType, filterAccountId, filterCategoryId, periodStart, periodEnd, searchQuery]);

  if (!isLoaded) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50 text-teal-800 font-bold">
        جاري تهيئة قاعدة البيانات المحلية (حسابتي)...
      </div>
    );
  }

  const currentModuleTitle = MODULE_DEFINITIONS.find((m) => m.id === activeModule)?.title || 'حسابتي';
  const cur = state.settings.defaultCurrency;
  const formatLocalDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  };
  const applyPeriodPreset = (preset: 'today' | 'week' | 'currentMonth' | 'previousMonth' | 'all') => {
    const today = new Date();
    if (preset === 'all') {
      setPeriodStart('');
      setPeriodEnd('');
      return;
    }
    if (preset === 'today') {
      const date = formatLocalDate(today);
      setPeriodStart(date);
      setPeriodEnd(date);
      return;
    }
    if (preset === 'week') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      setPeriodStart(formatLocalDate(start));
      setPeriodEnd(formatLocalDate(today));
      return;
    }
    if (preset === 'currentMonth') {
      setPeriodStart(formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1)));
      setPeriodEnd(formatLocalDate(today));
      return;
    }
    setPeriodStart(formatLocalDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)));
    setPeriodEnd(formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 0)));
  };
  const expenseCategories = (categoryBreakdown.categories as Array<{
    id: string;
    name: string;
    type: 'income' | 'expense';
    parentId: string | null;
    totalRollupAmount: number;
  }>)
    .filter((category) => category.type === 'expense' && category.totalRollupAmount > 0 && !category.parentId)
    .sort((a, b) => b.totalRollupAmount - a.totalRollupAmount);
  const lowStockItems = state.inventoryItems.filter((item) => item.quantity <= item.minQuantity);
  const cashFlowChart = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(); date.setDate(date.getDate() - (6 - index));
      return formatLocalDate(date);
    });
    return days.map((date) => state.transactions.filter((tx) => !tx.isVoided && tx.occurredAt === date).reduce((totals, tx) => {
      if (tx.type === 'income') totals.income += tx.amount;
      if (tx.type === 'expense' || tx.type === 'supplier_payment' || tx.type === 'worker_payout') totals.expense += tx.amount;
      if ((tx.type === 'transfer' || tx.type === 'person_transfer') && tx.transferStatus !== 'planned') totals.expense += tx.feeAmount || 0;
      return totals;
    }, { date, income: 0, expense: 0 }));
  }, [state.transactions]);
  const maxChartValue = Math.max(1, ...cashFlowChart.flatMap((item) => [item.income, item.expense]));

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Top App Bar */}
      <header className="bg-teal-800 text-white shadow-sm sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="فتح قائمة الوحدات"
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="touch-target px-3 py-2 rounded-xl bg-teal-900/60 hover:bg-teal-900 text-xs font-bold border border-teal-600"
            >
              ☰ الوحدات (18)
            </button>
            <div>
              <h1 className="text-base font-extrabold">{currentModuleTitle}</h1>
              <p className="text-[11px] text-teal-200">{dbInstance.getEngineName()}</p>
            </div>
          </div>
          {activeModule !== 'dashboard' && (
            <button
              type="button"
              onClick={() => setActiveModule('dashboard')}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-bold"
            >
              عودة للرئيسية ←
            </button>
          )}
        </div>
      </header>

      {/* Navigation Drawer for All 18 Modules */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 flex justify-start" onClick={() => setDrawerOpen(false)}>
          <div
            className="w-80 max-w-[85vw] bg-white h-full overflow-y-auto p-4 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <span className="font-extrabold text-teal-900">دليل وحدات حسابتي (18 وحدة)</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-xs font-bold text-slate-500 px-2 py-1 rounded bg-slate-100"
              >
                إغلاق ✕
              </button>
            </div>
            <div className="space-y-1.5">
              {MODULE_DEFINITIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setActiveModule(m.id);
                    setDrawerOpen(false);
                  }}
                  className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between ${
                    activeModule === m.id ? 'bg-teal-700 text-white' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span>{m.title}</span>
                  <span className="text-[10px] opacity-75">{m.group}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {banner && (
          <div
            role="alert"
            className={`p-3.5 rounded-xl text-sm font-bold border ${
              banner.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                : 'bg-rose-50 text-rose-900 border-rose-300'
            }`}
          >
            {banner.text}
          </div>
        )}

        {/* 1. DASHBOARD */}
        {activeModule === 'dashboard' && (
          <div className="space-y-4">
            <section className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-slate-500 font-semibold">إجمالي الأرصدة النقدية والبنكية الفعلية</div>
                  <div className="text-3xl font-extrabold text-slate-900 mt-1">
                    {summary.totalAccountBalances.toLocaleString('ar-EG')} {cur}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="date"
                    aria-label="من تاريخ"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="border rounded-lg px-2 py-1"
                  />
                  <span>إلى</span>
                  <input
                    type="date"
                    aria-label="إلى تاريخ"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="border rounded-lg px-2 py-1"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2" aria-label="فلاتر الفترة">
                <button type="button" onClick={() => applyPeriodPreset('today')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 active:scale-95">اليوم</button>
                <button type="button" onClick={() => applyPeriodPreset('week')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 active:scale-95">آخر 7 أيام</button>
                <button type="button" onClick={() => applyPeriodPreset('currentMonth')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 active:scale-95">الشهر الحالي</button>
                <button type="button" onClick={() => applyPeriodPreset('previousMonth')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 active:scale-95">الشهر السابق</button>
                <button type="button" onClick={() => applyPeriodPreset('all')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 active:scale-95">الكل</button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-emerald-800">إجمالي الدخل للفترة</div>
                  <div className="font-extrabold text-base text-emerald-900 mt-0.5">
                    +{summary.totalIncome.toLocaleString('ar-EG')} {cur}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-rose-800">إجمالي المصروفات</div>
                  <div className="font-extrabold text-base text-rose-900 mt-0.5">
                    -{summary.totalExpense.toLocaleString('ar-EG')} {cur}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200">
                  <div className="text-sky-800">صافي التدفق النقدي</div>
                  <div className="font-extrabold text-base text-sky-900 mt-0.5">
                    {summary.netCashMovement.toLocaleString('ar-EG')} {cur}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-amber-900">قيمة الأصول (منفصلة)</div>
                  <div className="font-extrabold text-base text-amber-900 mt-0.5">
                    {summary.totalAssetsValuation.toLocaleString('ar-EG')} {cur}
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => setActiveModule('accounts')}
                className="touch-target bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-teal-800 hover:bg-teal-50"
              >
                + حساب مالي جديد
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('income_expense')}
                className="touch-target bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-teal-800 hover:bg-teal-50"
              >
                + تسجيل مصروف / دخل
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('transfers')}
                className="touch-target bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-teal-800 hover:bg-teal-50"
              >
                ⇄ تحويل بين حسابين
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('projects')}
                className="touch-target bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-teal-800 hover:bg-teal-50"
              >
                + مشروع أو موقع عمل
              </button>
              <button
                type="button"
                onClick={() => setActiveModule('backup')}
                className="touch-target bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-teal-800 hover:bg-teal-50"
              >
                ⇩ نسخة احتياطية
              </button>
            </div>
            <section className="grid gap-4 sm:grid-cols-2">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between"><h2 className="font-extrabold">الحسابات والأرصدة</h2><button type="button" onClick={() => setActiveModule('accounts')} className="text-xs font-bold text-teal-700">إدارة</button></div>
                {state.accounts.length === 0 ? <p className="text-sm text-slate-500">أنشئ حسابًا نقديًا أو بنكيًا لبدء المتابعة.</p> : state.accounts.filter((account) => !account.isArchived).map((account) => <div key={account.id} className="flex items-center justify-between border-b last:border-0 py-2 text-sm"><span className="font-bold truncate">{account.name}</span><span className="font-extrabold whitespace-nowrap">{account.currentBalance.toLocaleString('ar-EG')} {cur}</span></div>)}
              </div>
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between"><h2 className="font-extrabold">توزيع المصروفات</h2><button type="button" onClick={() => setActiveModule('budgets_reports')} className="text-xs font-bold text-teal-700">التقرير</button></div>
                {expenseCategories.length === 0 ? <p className="text-sm text-slate-500">سجّل مصروفات فعلية لعرض التوزيع.</p> : expenseCategories.slice(0, 4).map((category) => <div key={category.id}><div className="flex justify-between gap-2 text-xs"><span className="truncate">{category.name}</span><strong>{category.totalRollupAmount.toLocaleString('ar-EG')} {cur}</strong></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-[width] duration-200" style={{ width: `${Math.min(100, summary.totalExpense ? category.totalRollupAmount / summary.totalExpense * 100 : 0)}%` }} /></div></div>)}
              </div>
            </section>
            <section className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between"><div><h2 className="font-extrabold">حركة الدخل والمصروف</h2><p className="text-xs text-slate-500">آخر 7 أيام — اضغط عمودًا لتصفية اليوم</p></div><div className="flex gap-2 text-[11px]"><span className="text-emerald-700">■ دخل</span><span className="text-rose-700">■ مصروف</span></div></div>
              {cashFlowChart.every((item) => item.income === 0 && item.expense === 0) ? <p className="py-8 text-center text-sm text-slate-500">لا توجد حركة فعلية خلال آخر 7 أيام.</p> : <div className="grid grid-cols-7 gap-2 items-end h-36" dir="ltr">{cashFlowChart.map((item) => <button key={item.date} type="button" title={`${item.date}: دخل ${item.income}، مصروف ${item.expense}`} onClick={() => { setPeriodStart(item.date); setPeriodEnd(item.date); }} className="h-full flex items-end justify-center gap-0.5 rounded-lg hover:bg-slate-50 active:scale-95 transition-transform"><span className="w-2 rounded-t bg-emerald-500" style={{height:`${Math.max(item.income ? 5 : 0,item.income/maxChartValue*100)}%`}}/><span className="w-2 rounded-t bg-rose-500" style={{height:`${Math.max(item.expense ? 5 : 0,item.expense/maxChartValue*100)}%`}}/></button>)}</div>}
              <div className="grid grid-cols-7 gap-2 text-center text-[10px] text-slate-500" dir="ltr">{cashFlowChart.map(item=><span key={item.date}>{item.date.slice(8)}</span>)}</div>
            </section>
            {(lowStockItems.length > 0 || summary.totalPersonalReimbursementDue > 0 || state.settings.lastBackupAt) && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2"><h2 className="font-extrabold text-amber-950">تنبيهات وحالة النسخ الاحتياطي</h2>{lowStockItems.length > 0 && <p className="text-sm text-amber-900">{lowStockItems.length} صنف وصل إلى حد تنبيه المخزون.</p>}{summary.totalPersonalReimbursementDue > 0 && <p className="text-sm text-amber-900">مستحق لك من مدفوعات شخصية: {summary.totalPersonalReimbursementDue.toLocaleString('ar-EG')} {cur}.</p>}{state.settings.lastBackupAt && <p className="text-sm text-amber-900">آخر نسخة احتياطية: {new Date(state.settings.lastBackupAt).toLocaleDateString('ar-EG')}.</p>}</section>}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between"><h2 className="font-extrabold">آخر العمليات</h2><button type="button" onClick={() => setActiveModule('transactions')} className="text-xs font-bold text-teal-700">عرض الكل</button></div>
              {state.transactions.filter(t => !t.isVoided).slice(0,5).length === 0 ? <div className="rounded-xl bg-slate-50 border border-dashed border-slate-300 p-5 text-center"><div className="font-bold text-slate-700">لسه مفيش عمليات مالية</div><p className="text-xs text-slate-500 mt-1">ابدأ بإضافة حساب ثم سجّل أول دخل أو مصروف.</p><button type="button" onClick={() => setActiveModule(state.accounts.length ? 'income_expense' : 'accounts')} className="touch-target mt-3 px-4 py-2 rounded-xl bg-teal-700 text-white text-sm font-bold">{state.accounts.length ? 'تسجيل أول عملية' : 'إنشاء أول حساب'}</button></div> : state.transactions.filter(t => !t.isVoided).slice(0,5).map(tx => <div key={tx.id} className="flex justify-between gap-3 border-b last:border-0 pb-2 last:pb-0"><div><div className="font-bold text-sm">{tx.note || (tx.type === 'income' ? 'دخل' : tx.type === 'expense' ? 'مصروف' : 'تحويل مالي')}</div><div className="text-xs text-slate-500">{tx.occurredAt} · {state.accounts.find(a=>a.id===tx.accountId)?.name || 'دفع شخصي'}</div></div><strong className={`text-sm whitespace-nowrap ${tx.type==='income'?'text-emerald-700':tx.type==='expense'?'text-rose-700':'text-slate-700'}`}>{tx.type==='income'?'+':tx.type==='expense'?'−':''}{tx.amount.toLocaleString('ar-EG')} {cur}</strong></div>)}
            </section>
          </div>
        )}

        {/* 2. ACCOUNTS */}
        {activeModule === 'accounts' && (
          <div className="space-y-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const payload = {
                    name: accName,
                    type: accType,
                    initialBalance: accInitialBalance,
                    notes: accNotes,
                  };
                  const next = editingAccountId ? updateAccount(state, editingAccountId, payload) : addAccount(state, payload);
                  await persistAndSet(next, editingAccountId ? 'تم تعديل الحساب وإعادة حساب رصيده' : 'تم إنشاء الحساب بنجاح');
                  setAccName('');
                  setAccInitialBalance('0');
                  setAccNotes('');
                  setEditingAccountId(null);
                } catch (err: any) {
                  notify('error', err.message);
                }
              }}
              className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between"><h2 className="font-bold text-sm">{editingAccountId ? 'تعديل الحساب المالي' : 'إضافة حساب مالي جديد'}</h2>{editingAccountId && <button type="button" onClick={() => { setEditingAccountId(null); setAccName(''); setAccInitialBalance('0'); setAccNotes(''); }} className="text-xs text-slate-600 underline">إلغاء التعديل</button>}</div>
              <input
                type="text"
                required
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                placeholder="اسم الحساب (مثال: الخزينة الرئيسية، البنك الأهلي)"
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as AccountType)}
                  className="border rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="cash">نقدي (كاش)</option>
                  <option value="bank">حساب بنكي</option>
                  <option value="wallet">محفظة إلكترونية</option>
                  <option value="savings">حساب توفير</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={accInitialBalance}
                  onChange={(e) => setAccInitialBalance(e.target.value)}
                  placeholder="الرصيد الافتتاحي"
                  className="border rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <textarea value={accNotes} onChange={(e) => setAccNotes(e.target.value)} placeholder="ملاحظات (اختياري)" className="w-full border rounded-xl px-3 py-2 text-sm" />
              <button disabled={isSubmitting} type="submit" className="touch-target w-full bg-teal-700 text-white font-bold rounded-xl text-sm disabled:opacity-50">
                {editingAccountId ? 'حفظ التعديل' : 'حفظ الحساب'}
              </button>
            </form>
            <section className="bg-white rounded-2xl p-4 border border-slate-200"><h2 className="font-extrabold mb-3">حساباتك</h2>{state.accounts.length===0?<p className="text-sm text-slate-500">لا توجد حسابات حتى الآن.</p>:state.accounts.map(a=><div key={a.id} className="py-3 border-b last:border-0"><div className="flex items-start justify-between gap-3"><div><div className="font-bold text-sm">{a.name}</div><div className="text-xs text-slate-500">{{cash:'نقدي',bank:'بنكي',wallet:'محفظة إلكترونية',savings:'توفير'}[a.type]} · رصيد افتتاحي {a.initialBalance.toLocaleString('ar-EG')} {cur}</div></div><strong className="text-sm whitespace-nowrap">{a.currentBalance.toLocaleString('ar-EG')} {cur}</strong></div><div className="mt-2 flex gap-3 text-xs font-bold"><button type="button" onClick={() => { setEditingAccountId(a.id); setAccName(a.name); setAccType(a.type); setAccInitialBalance(String(a.initialBalance)); setAccNotes(a.notes || ''); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="text-teal-700 underline">تعديل</button><button type="button" onClick={() => setAccountHistoryId(accountHistoryId === a.id ? null : a.id)} className="text-teal-700 underline">{accountHistoryId === a.id ? 'إخفاء الحركات' : 'سجل الحركات'}</button></div>{accountHistoryId === a.id && <div className="mt-3 rounded-xl bg-slate-50 p-3 space-y-2">{state.transactions.filter(tx => tx.accountId === a.id || tx.toAccountId === a.id).length === 0 ? <p className="text-xs text-slate-500">لا توجد حركات مرتبطة بهذا الحساب.</p> : state.transactions.filter(tx => tx.accountId === a.id || tx.toAccountId === a.id).map(tx => <div key={tx.id} className="flex justify-between gap-2 text-xs"><span>{tx.occurredAt} · {tx.note || tx.type}{tx.isVoided ? ' (ملغاة)' : ''}</span><strong>{tx.amount.toLocaleString('ar-EG')} {cur}</strong></div>)}</div>}</div>)}</section>
          </div>
        )}

        {/* TRANSACTIONS: real persistent financial workflow */}
        {(activeModule === 'transactions' || activeModule === 'income_expense' || activeModule === 'transfers') && (
          <div className="space-y-4">
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const effectiveType: TransactionType = activeModule === 'transfers' ? (transferMode === 'person' ? 'person_transfer' : 'transfer') : txType;
                const payload = {
                  type: effectiveType,
                  accountId: txAccountId || null,
                  toAccountId: effectiveType === 'transfer' ? txToAccountId : null,
                  categoryId: txCategoryId,
                  projectId: txProjectId || null,
                  amount: txAmount,
                  feeAmount: effectiveType === 'transfer' || effectiveType === 'person_transfer' ? txFeeAmount : '0',
                  paidByPersonal: txPaidByPersonal,
                  note: txNote,
                  occurredAt: txDate,
                  recipientName: personRecipient,
                  transferStatus: personTransferStatus,
                  transferMethod: personTransferMethod,
                  purpose: personTransferPurpose,
                  submissionId: editingTransactionId ? undefined : `ui-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                };
                const next = editingTransactionId ? updateTransaction(state, editingTransactionId, payload) : addTransaction(state, payload);
                await persistAndSet(next, editingTransactionId ? 'تم تعديل العملية وإعادة حساب الأرصدة' : 'تم حفظ العملية وتحديث الأرصدة');
                setTxAmount(''); setTxFeeAmount('0'); setTxNote(''); setTxPaidByPersonal(false); setEditingTransactionId(null); setPersonRecipient(''); setPersonTransferMethod(''); setPersonTransferPurpose(''); setPersonTransferStatus('completed');
              } catch (err: any) { notify('error', err.message || 'تعذر تسجيل العملية'); }
            }} className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2"><h2 className="font-extrabold">{editingTransactionId ? 'تعديل عملية مالية' : activeModule === 'transfers' ? 'تحويل مالي' : 'تسجيل عملية مالية'}</h2>{editingTransactionId ? <button type="button" onClick={() => { setEditingTransactionId(null); setTxAmount(''); setTxNote(''); }} className="text-xs text-slate-600 underline">إلغاء التعديل</button> : <span className="text-xs text-slate-500">حفظ محلي</span>}</div>
              {activeModule === 'transfers' && <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setTransferMode('internal')} className={`touch-target rounded-xl border p-2 text-sm font-bold ${transferMode === 'internal' ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-white'}`}>بين حساباتي</button><button type="button" onClick={() => setTransferMode('person')} className={`touch-target rounded-xl border p-2 text-sm font-bold ${transferMode === 'person' ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-white'}`}>لشخص</button></div>}
              {activeModule !== 'transfers' && <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setTxType('income')} className={`touch-target rounded-xl border p-2 text-sm font-bold ${txType === 'income' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-white'}`}>دخل</button><button type="button" onClick={() => setTxType('expense')} className={`touch-target rounded-xl border p-2 text-sm font-bold ${txType === 'expense' ? 'bg-rose-50 border-rose-400 text-rose-800' : 'bg-white'}`}>مصروف</button></div>}
              <label className="block text-xs font-bold text-slate-600">الحساب {activeModule === 'transfers' ? 'المُحوِّل' : 'المالي'}</label>
              <select required value={txAccountId} onChange={e => setTxAccountId(e.target.value)} className="w-full border rounded-xl p-3 text-sm bg-white"><option value="">اختر حسابًا</option>{state.accounts.filter(a => !a.isArchived).map(a => <option key={a.id} value={a.id}>{a.name} · {a.currentBalance.toLocaleString('ar-EG')} {cur}</option>)}</select>
              {(activeModule === 'transfers' && transferMode === 'internal' || txType === 'transfer') && <><label className="block text-xs font-bold text-slate-600">الحساب المستلم</label><select required value={txToAccountId} onChange={e => setTxToAccountId(e.target.value)} className="w-full border rounded-xl p-3 text-sm bg-white"><option value="">اختر الحساب المستلم</option>{state.accounts.filter(a => a.id !== txAccountId && !a.isArchived).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></>}
              <div className="grid grid-cols-2 gap-2"><div><label className="block text-xs font-bold text-slate-600 mb-1">المبلغ ({cur})</label><input required type="number" min="0.01" step="0.01" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" className="w-full border rounded-xl p-3 text-sm" /></div><div><label className="block text-xs font-bold text-slate-600 mb-1">التاريخ</label><input required type="date" value={txDate} onChange={e => setTxDate(e.target.value)} className="w-full border rounded-xl p-3 text-sm" /></div></div>
              {(activeModule === 'transfers' || txType === 'transfer') && <div><label className="block text-xs font-bold text-slate-600 mb-1">رسوم التحويل ({cur})</label><input type="number" min="0" step="0.01" value={txFeeAmount} onChange={e => setTxFeeAmount(e.target.value)} className="w-full border rounded-xl p-3 text-sm" /></div>}
              {activeModule === 'transfers' && transferMode === 'person' && <div className="space-y-2 rounded-xl bg-slate-50 p-3"><input required value={personRecipient} onChange={e => setPersonRecipient(e.target.value)} placeholder="اسم المستلم" className="w-full border rounded-xl p-3 text-sm"/><div className="grid grid-cols-2 gap-2"><input value={personTransferMethod} onChange={e => setPersonTransferMethod(e.target.value)} placeholder="وسيلة التحويل" className="w-full border rounded-xl p-3 text-sm"/><select value={personTransferStatus} onChange={e => setPersonTransferStatus(e.target.value as 'planned'|'completed')} className="w-full border rounded-xl p-3 text-sm bg-white"><option value="completed">منفذ الآن</option><option value="planned">مخطط (لا يخصم الرصيد)</option></select></div><input value={personTransferPurpose} onChange={e => setPersonTransferPurpose(e.target.value)} placeholder="الغرض (اختياري)" className="w-full border rounded-xl p-3 text-sm"/><p className="text-xs text-slate-500">المبلغ والرسوم منفصلان؛ الحالة المخططة لا تؤثر على الرصيد أو الملخص المالي.</p></div>}
              {activeModule !== 'transfers' && <div><label className="block text-xs font-bold text-slate-600 mb-1">التصنيف</label><select value={txCategoryId} onChange={e => setTxCategoryId(e.target.value)} className="w-full border rounded-xl p-3 text-sm bg-white">{state.categories.filter(c => c.type === (txType === 'income' ? 'income' : 'expense')).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>}
              <input value={txNote} onChange={e => setTxNote(e.target.value)} placeholder="بيان العملية أو ملاحظات (اختياري)" className="w-full border rounded-xl p-3 text-sm" />
              {activeModule !== 'transfers' && txType === 'expense' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={txPaidByPersonal} onChange={e => setTxPaidByPersonal(e.target.checked)} /> دفعت المصروف من فلوسي الشخصية</label>}
              <button disabled={isSubmitting || state.accounts.length === 0} type="submit" className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold disabled:opacity-50">{isSubmitting ? 'جارٍ الحفظ...' : editingTransactionId ? 'حفظ التعديل' : 'حفظ العملية'}</button>
              {state.accounts.length === 0 && <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl">لازم تضيف حسابًا ماليًا أولًا من قسم الحسابات.</p>}
            </form>
            <section className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3"><h2 className="font-extrabold">سجل العمليات</h2>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ابحث في البيان أو الحساب أو التصنيف" className="w-full border rounded-xl p-3 text-sm" />
              <div className="flex gap-2"><select value={filterType} onChange={e => setFilterType(e.target.value)} className="min-w-0 flex-1 border rounded-xl p-2 text-xs bg-white"><option value="all">كل الأنواع</option><option value="income">دخل</option><option value="expense">مصروف</option><option value="transfer">تحويل</option></select><select value={filterAccountId} onChange={e => setFilterAccountId(e.target.value)} className="min-w-0 flex-1 border rounded-xl p-2 text-xs bg-white"><option value="all">كل الحسابات</option>{state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              {filteredTransactions.length === 0 ? <div className="text-center py-8 text-sm text-slate-500">لا توجد عمليات تطابق البحث.</div> : filteredTransactions.map(tx => <div key={tx.id} className="flex items-start justify-between gap-3 border-b last:border-0 pb-3 last:pb-0"><div className="min-w-0"><div className="font-bold text-sm">{tx.note || (tx.type === 'income' ? 'دخل' : tx.type === 'expense' ? 'مصروف' : tx.type === 'transfer' ? 'تحويل بين حسابين' : tx.type === 'person_transfer' ? `تحويل إلى ${tx.recipientName}` : tx.type)}</div><div className="text-xs text-slate-500 mt-1">{tx.occurredAt} · {state.accounts.find(a => a.id === tx.accountId)?.name || 'دفع شخصي'}{tx.transferStatus === 'planned' ? ' · مخطط' : ''}{tx.isVoided ? ' · ملغاة' : ''}</div></div><div className={`font-extrabold text-sm whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-700' : tx.type === 'expense' || tx.type === 'worker_payout' || tx.type === 'supplier_payment' ? 'text-rose-700' : 'text-slate-700'}`}>{tx.type === 'income' ? '+' : tx.type === 'expense' ? '−' : ''}{tx.amount.toLocaleString('ar-EG')} {cur}</div>{!tx.isVoided && <div className="flex gap-2"><button type="button" onClick={() => { setEditingTransactionId(tx.id); setTxType(tx.type === 'income' ? 'income' : 'expense'); setTxAccountId(tx.accountId || ''); setTxToAccountId(tx.toAccountId || ''); setTxCategoryId(tx.categoryId); setTxProjectId(tx.projectId || ''); setTxAmount(String(tx.amount)); setTxFeeAmount(String(tx.feeAmount || 0)); setTxPaidByPersonal(Boolean(tx.paidByPersonal)); setTxNote(tx.note); setTxDate(tx.occurredAt); setPersonRecipient(tx.recipientName || ''); setPersonTransferStatus(tx.transferStatus || 'completed'); setPersonTransferMethod(tx.transferMethod || ''); setPersonTransferPurpose(tx.purpose || ''); if (tx.type === 'person_transfer') { setTransferMode('person'); setActiveModule('transfers'); } else if (tx.type === 'transfer') { setTransferMode('internal'); setActiveModule('transfers'); } window.scrollTo({top: 0, behavior: 'smooth'}); }} className="text-xs text-teal-700 underline">تعديل</button><button type="button" aria-label="إلغاء العملية" onClick={async () => { if (window.confirm('سيتم إلغاء أثر العملية ماليًا مع الاحتفاظ بسجلها. متابعة؟')) { try { await persistAndSet(voidTransaction(state, tx.id), 'تم إلغاء العملية وإعادة حساب الأرصدة'); } catch (err: any) { notify('error', err.message); } } }} className="text-xs text-rose-700 underline">إلغاء</button></div>}</div>)}
            </section>
          </div>
        )}

        {/* CATEGORIES */}
        {activeModule === 'categories' && <div className="space-y-4"><form onSubmit={async e => { e.preventDefault(); try { await persistAndSet(addCategory(state, {name: catName, type: catType, parentId: catParentId || null}), 'تمت إضافة التصنيف'); setCatName(''); setCatParentId(''); } catch(err:any) { notify('error', err.message); } }} className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3"><h2 className="font-extrabold">إضافة تصنيف</h2><input required value={catName} onChange={e=>setCatName(e.target.value)} placeholder="اسم التصنيف" className="w-full border rounded-xl p-3 text-sm"/><select value={catType} onChange={e=>{setCatType(e.target.value as 'income'|'expense');setCatParentId('')}} className="w-full border rounded-xl p-3 text-sm bg-white"><option value="expense">مصروف</option><option value="income">دخل</option></select><select value={catParentId} onChange={e=>setCatParentId(e.target.value)} className="w-full border rounded-xl p-3 text-sm bg-white"><option value="">تصنيف رئيسي</option>{state.categories.filter(c=>c.type===catType).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button disabled={isSubmitting} className="touch-target w-full bg-teal-700 text-white rounded-xl p-3 font-bold">حفظ التصنيف</button></form><section className="bg-white rounded-2xl p-4 border border-slate-200"><h2 className="font-extrabold mb-3">التصنيفات الحالية</h2>{state.categories.map(c=><div key={c.id} className="py-2 border-b last:border-0 text-sm">{c.parentId ? '↳ ' : ''}{c.name}<span className="text-xs text-slate-500"> · {c.type==='income'?'دخل':'مصروف'}</span></div>)}</section></div>}

        {/* BACKUP & RESTORE */}
        {activeModule === 'backup' && <div className="space-y-4"><section className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3"><h2 className="font-extrabold">النسخ الاحتياطي والاستعادة</h2><p className="text-sm text-slate-600">صدّر بيانات حسابتي إلى ملف JSON واحتفظ به خارج الهاتف. الاستعادة تستبدل البيانات الحالية بعد تأكيدك.</p><button type="button" disabled={isSubmitting} className="touch-target w-full bg-teal-700 text-white rounded-xl p-3 font-bold disabled:opacity-50" onClick={async () => { try { const backupState = updateSettings(state, {lastBackupAt: new Date().toISOString()}); const json = exportSnapshotJson(backupState); const blob = new Blob([json], {type:'application/json;charset=utf-8'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`Hesabty_Backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); await persistAndSet(backupState, 'تم تجهيز ملف النسخة الاحتياطية للتنزيل'); } catch (err: any) { notify('error', err.message || 'تعذر إنشاء النسخة الاحتياطية'); } }}>{isSubmitting ? 'جارٍ تجهيز النسخة...' : 'تصدير نسخة احتياطية'}</button>{state.settings.lastBackupAt && <p className="text-xs text-emerald-800">آخر نسخة ناجحة: {new Date(state.settings.lastBackupAt).toLocaleString('ar-EG')}</p>}<label className="block text-sm font-bold">اختيار ملف استعادة<input type="file" accept=".json,application/json" className="block w-full mt-2 text-sm" onChange={async e => { const file=e.target.files?.[0]; if(!file) return; try { const raw=await file.text(); setImportJsonText(raw); setConfirmRestoreOpen(true); } catch { notify('error','تعذر قراءة الملف'); } e.currentTarget.value=''; }} /></label><div className="text-xs text-slate-500">لا ترفع النسخة الاحتياطية إلى مكان عام؛ قد تحتوي على بيانات مالية شخصية.</div></section>{confirmRestoreOpen && <section className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3"><h3 className="font-extrabold text-amber-950">تأكيد استبدال البيانات</h3><p className="text-sm text-amber-900">سيتم استبدال البيانات الحالية بمحتويات الملف المختار. خذ نسخة من بياناتك الحالية أولًا.</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={async()=>{try {const restored=importSnapshotJson(importJsonText);await persistAndSet(restored,'تمت استعادة النسخة الاحتياطية');setConfirmRestoreOpen(false);setImportJsonText('');}catch(err:any){notify('error',err.message);}}} className="touch-target rounded-xl bg-amber-700 text-white font-bold p-3">تأكيد الاستعادة</button><button type="button" onClick={()=>{setConfirmRestoreOpen(false);setImportJsonText('')}} className="touch-target rounded-xl border border-amber-400 font-bold p-3">إلغاء</button></div></section>}</div>}

        {/* REPORTS */}
        {activeModule === 'budgets_reports' && <div className="space-y-4"><section className="bg-white rounded-2xl p-5 border border-slate-200"><h2 className="font-extrabold mb-4">ملخص مالي حسب الفترة</h2><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">من<input type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)} className="block w-full border rounded-xl p-2 mt-1"/></label><label className="text-xs font-bold">إلى<input type="date" value={periodEnd} onChange={e=>setPeriodEnd(e.target.value)} className="block w-full border rounded-xl p-2 mt-1"/></label></div><div className="grid grid-cols-2 gap-3 mt-4"><div className="rounded-xl bg-emerald-50 p-3"><div className="text-xs text-emerald-800">الدخل</div><strong className="text-lg">{summary.totalIncome.toLocaleString('ar-EG')} {cur}</strong></div><div className="rounded-xl bg-rose-50 p-3"><div className="text-xs text-rose-800">المصروفات</div><strong className="text-lg">{summary.totalExpense.toLocaleString('ar-EG')} {cur}</strong></div><div className="rounded-xl bg-sky-50 p-3"><div className="text-xs text-sky-800">صافي الحركة</div><strong className="text-lg">{summary.netCashMovement.toLocaleString('ar-EG')} {cur}</strong></div><div className="rounded-xl bg-slate-100 p-3"><div className="text-xs">الأصول</div><strong className="text-lg">{summary.totalAssetsValuation.toLocaleString('ar-EG')} {cur}</strong></div></div></section><section className="bg-white rounded-2xl p-4 border border-slate-200"><h3 className="font-extrabold mb-3">المصروفات حسب التصنيف</h3>{expenseCategories.length===0 ? <p className="text-sm text-slate-500">ستظهر النتائج بعد تسجيل مصروفات فعلية.</p> : expenseCategories.map(c=><div key={c.id} className="mb-3"><div className="flex justify-between text-sm"><span>{c.name}</span><strong>{c.totalRollupAmount.toLocaleString('ar-EG')} {cur}</strong></div><div className="h-2 rounded-full bg-slate-100 mt-1 overflow-hidden"><div className="h-full bg-teal-600" style={{width:`${Math.min(100,summary.totalExpense ? c.totalRollupAmount/summary.totalExpense*100 : 0)}%`}}/></div></div>)}</section></div>}

        {/* SETTINGS */}
        {activeModule === 'settings' && <div className="space-y-4"><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(updateSettings(state,{userName:state.settings.userName,organizationName:state.settings.organizationName,defaultCurrency:cur}), 'تم حفظ الإعدادات');}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3"><h2 className="font-extrabold">الإعدادات العامة</h2><label className="block text-sm">اسم المستخدم<input value={state.settings.userName||''} onChange={e=>setState(prev=>({...prev,settings:{...prev.settings,userName:e.target.value}}))} className="block w-full border rounded-xl p-3 mt-1"/></label><label className="block text-sm">اسم النشاط أو المؤسسة<input value={state.settings.organizationName||''} onChange={e=>setState(prev=>({...prev,settings:{...prev.settings,organizationName:e.target.value}}))} className="block w-full border rounded-xl p-3 mt-1"/></label><label className="block text-sm">العملة الأساسية<select value={cur} onChange={e=>setState(prev=>({...prev,settings:{...prev.settings,defaultCurrency:e.target.value}}))} className="block w-full border rounded-xl p-3 mt-1 bg-white"><option value="EGP">جنيه مصري (EGP)</option><option value="SAR">ريال سعودي (SAR)</option><option value="AED">درهم إماراتي (AED)</option><option value="USD">دولار أمريكي (USD)</option></select></label><button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ الإعدادات</button></form><button type="button" onClick={()=>setActiveModule('backup')} className="touch-target w-full rounded-xl border border-slate-300 bg-white p-3 font-bold">النسخ الاحتياطي والاستعادة</button></div>}

        {/* PROJECTS */}
        {activeModule === 'projects' && <div className="space-y-4"><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(addProject(state,{name:projName,clientName:projClient,budget:projBudget}), 'تم إنشاء المشروع');setProjName('');setProjClient('');setProjBudget('0');}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3"><h2 className="font-extrabold">إضافة مشروع أو موقع عمل</h2><input required value={projName} onChange={e=>setProjName(e.target.value)} placeholder="اسم المشروع" className="w-full border rounded-xl p-3 text-sm"/><input value={projClient} onChange={e=>setProjClient(e.target.value)} placeholder="اسم العميل (اختياري)" className="w-full border rounded-xl p-3 text-sm"/><input type="number" min="0" step="0.01" value={projBudget} onChange={e=>setProjBudget(e.target.value)} placeholder="الميزانية" className="w-full border rounded-xl p-3 text-sm"/><button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ المشروع</button></form><section className="bg-white rounded-2xl p-4 border border-slate-200"><h3 className="font-extrabold mb-3">المشاريع</h3>{state.projects.length===0?<p className="text-sm text-slate-500">لا توجد مشاريع بعد.</p>:state.projects.map(p=><div key={p.id} className="border-b last:border-0 py-3"><div className="font-bold">{p.name}</div><div className="text-xs text-slate-500">{p.clientName||'بدون عميل'} · الميزانية {p.budget.toLocaleString('ar-EG')} {cur}</div><div className="text-xs mt-1">المصروف {p.totalSpent.toLocaleString('ar-EG')} · المستحق لك {p.personalReimbursementDue.toLocaleString('ar-EG')} {cur}</div></div>)}</section></div>}

        {activeModule === 'tasks' && <div className="space-y-4"><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(addTask(state,{title:taskTitle,priority:taskPriority,dueDate:taskDueDate}), 'تم حفظ المهمة');setTaskTitle('')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">مهمة يومية</h2><input required value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="ما المطلوب؟" className="w-full border rounded-xl p-3 text-sm"/><div className="grid grid-cols-2 gap-2"><input type="date" value={taskDueDate} onChange={e=>setTaskDueDate(e.target.value)} className="border rounded-xl p-3 text-sm"/><select value={taskPriority} onChange={e=>setTaskPriority(e.target.value as any)} className="border rounded-xl p-3 text-sm"><option value="high">عالية</option><option value="normal">عادية</option><option value="low">منخفضة</option></select></div><button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ المهمة</button></form><section className="bg-white rounded-2xl p-4 border space-y-2">{state.tasks.length===0?<p className="text-sm text-slate-500">لا توجد مهام.</p>:state.tasks.map(task=><div key={task.id} className="flex items-center justify-between gap-2 border-b last:border-0 py-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={task.isCompleted} onChange={async()=>{try{await persistAndSet(toggleTaskCompletion(state,task.id),'تم تحديث المهمة')}catch(err:any){notify('error',err.message)}}}/><span className={task.isCompleted?'line-through text-slate-400':''}>{task.title}</span></label><span className="text-xs text-slate-500">{task.dueDate}</span></div>)}</section></div>}

        {activeModule === 'workers' && <div className="space-y-4"><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(addWorker(state,{name:workerName,role:workerRole,dailyRate:workerRate}),'تم حفظ العامل');setWorkerName('');setWorkerRole('');setWorkerRate('0')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">إضافة عامل</h2><input required value={workerName} onChange={e=>setWorkerName(e.target.value)} placeholder="اسم العامل" className="w-full border rounded-xl p-3 text-sm"/><div className="grid grid-cols-2 gap-2"><input value={workerRole} onChange={e=>setWorkerRole(e.target.value)} placeholder="المهنة" className="border rounded-xl p-3 text-sm"/><input required type="number" min="0" step="0.01" value={workerRate} onChange={e=>setWorkerRate(e.target.value)} placeholder="الأجر اليومي" className="border rounded-xl p-3 text-sm"/></div><button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ العامل</button></form><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(recordWorkerOperation(state,{workerId:wRecWorkerId,recordType:wRecType,amount:wRecAmount,accountId:(wRecType==='advance'||wRecType==='payout')?txAccountId||null:null,occurredAt:txDate}),'تم حفظ حركة العامل');setWRecAmount('')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">أجر / سلفة / صرف</h2><select required value={wRecWorkerId} onChange={e=>setWRecWorkerId(e.target.value)} className="w-full border rounded-xl p-3 text-sm"><option value="">اختر العامل</option>{state.workers.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><select value={wRecType} onChange={e=>setWRecType(e.target.value as any)} className="border rounded-xl p-3 text-sm"><option value="wage">استحقاق أجر</option><option value="advance">سلفة</option><option value="payout">صرف</option></select><input required type="number" min="0.01" step="0.01" value={wRecAmount} onChange={e=>setWRecAmount(e.target.value)} placeholder="المبلغ" className="border rounded-xl p-3 text-sm"/></div>{(wRecType==='advance'||wRecType==='payout')&&<select required value={txAccountId} onChange={e=>setTxAccountId(e.target.value)} className="w-full border rounded-xl p-3 text-sm"><option value="">حساب الدفع</option>{state.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}<button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ الحركة</button></form><section className="bg-white rounded-2xl p-4 border">{state.workers.map(w=><div key={w.id} className="border-b last:border-0 py-3 text-sm"><strong>{w.name}</strong><div className="text-xs text-slate-500 mt-1">مستحق: {w.remainingPayable.toLocaleString('ar-EG')} {cur} · سلف: {w.totalAdvances.toLocaleString('ar-EG')}</div></div>)}</section></div>}

        {activeModule === 'purchases' && <div className="space-y-4"><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(addSupplier(state,{name:supName,phone:supPhone}),'تم حفظ المورد');setSupName('');setSupPhone('')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">مورد جديد</h2><div className="grid grid-cols-2 gap-2"><input required value={supName} onChange={e=>setSupName(e.target.value)} placeholder="اسم المورد" className="border rounded-xl p-3 text-sm"/><input value={supPhone} onChange={e=>setSupPhone(e.target.value)} placeholder="الهاتف" className="border rounded-xl p-3 text-sm"/></div><button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ المورد</button></form><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(addPurchaseInvoice(state,{supplierId:purSupplierId,invoiceNo:purInvoiceNo,totalAmount:purTotal,paidAmount:purPaid,accountId:Number(purPaid)>0?txAccountId:null,occurredAt:txDate}),'تم حفظ الفاتورة');setPurTotal('');setPurPaid('0');setPurInvoiceNo('')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">فاتورة مشتريات</h2><select required value={purSupplierId} onChange={e=>setPurSupplierId(e.target.value)} className="w-full border rounded-xl p-3 text-sm"><option value="">اختر المورد</option>{state.suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><div className="grid grid-cols-2 gap-2"><input value={purInvoiceNo} onChange={e=>setPurInvoiceNo(e.target.value)} placeholder="رقم الفاتورة" className="border rounded-xl p-3 text-sm"/><input required type="number" min="0.01" value={purTotal} onChange={e=>setPurTotal(e.target.value)} placeholder="الإجمالي" className="border rounded-xl p-3 text-sm"/></div><div className="grid grid-cols-2 gap-2"><input type="number" min="0" value={purPaid} onChange={e=>setPurPaid(e.target.value)} placeholder="مدفوع الآن" className="border rounded-xl p-3 text-sm"/><select value={txAccountId} onChange={e=>setTxAccountId(e.target.value)} className="border rounded-xl p-3 text-sm"><option value="">حساب الدفع</option>{state.accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div><button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ الفاتورة</button></form><section className="bg-white rounded-2xl p-4 border">{state.suppliers.map(s=><div key={s.id} className="border-b last:border-0 py-3 text-sm"><strong>{s.name}</strong><div className="text-xs text-slate-500">المستحق: {s.balanceDue.toLocaleString('ar-EG')} {cur}</div></div>)}</section></div>}

        {activeModule === 'inventory' && <div className="space-y-4"><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(addInventoryItem(state,{name:invName,quantity:invQty,unit:invUnit,unitCost:invCost}),'تمت إضافة الصنف');setInvName('');setInvQty('0');setInvCost('0')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">صنف مخزني</h2><input required value={invName} onChange={e=>setInvName(e.target.value)} placeholder="اسم الصنف" className="w-full border rounded-xl p-3 text-sm"/><div className="grid grid-cols-3 gap-2"><input required type="number" min="0" value={invQty} onChange={e=>setInvQty(e.target.value)} placeholder="الكمية" className="border rounded-xl p-3 text-sm"/><input value={invUnit} onChange={e=>setInvUnit(e.target.value)} placeholder="الوحدة" className="border rounded-xl p-3 text-sm"/><input required type="number" min="0" value={invCost} onChange={e=>setInvCost(e.target.value)} placeholder="تكلفة" className="border rounded-xl p-3 text-sm"/></div><button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ الصنف</button></form><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(recordStockMovement(state,{itemId:stockItemId,movementType:stockMovementType,quantity:stockMovementQty,occurredAt:txDate}),'تم حفظ حركة المخزون');setStockMovementQty('')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">حركة مخزون</h2><div className="grid grid-cols-3 gap-2"><select required value={stockItemId} onChange={e=>setStockItemId(e.target.value)} className="border rounded-xl p-3 text-sm"><option value="">الصنف</option>{state.inventoryItems.map(i=><option key={i.id} value={i.id}>{i.name}</option>)}</select><select value={stockMovementType} onChange={e=>setStockMovementType(e.target.value as any)} className="border rounded-xl p-3 text-sm"><option value="out">صرف</option><option value="in">إضافة</option></select><input required type="number" min="0.01" value={stockMovementQty} onChange={e=>setStockMovementQty(e.target.value)} placeholder="الكمية" className="border rounded-xl p-3 text-sm"/></div><button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ الحركة</button></form><section className="bg-white rounded-2xl p-4 border">{state.inventoryItems.map(i=><div key={i.id} className="flex justify-between border-b last:border-0 py-3 text-sm"><span>{i.name}</span><strong className={i.quantity<=i.minQuantity?'text-rose-700':''}>{i.quantity} {i.unit}</strong></div>)}</section></div>}

        {activeModule === 'assets' && <div className="space-y-4"><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(addAsset(state,{name:assetName,purchaseValue:assetValue,currentValue:assetValue}),'تم حفظ الأصل');setAssetName('');setAssetValue('0')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">أصل أو مركبة</h2><input required value={assetName} onChange={e=>setAssetName(e.target.value)} placeholder="اسم الأصل" className="w-full border rounded-xl p-3 text-sm"/><input required type="number" min="0" step="0.01" value={assetValue} onChange={e=>setAssetValue(e.target.value)} placeholder="قيمة الشراء" className="w-full border rounded-xl p-3 text-sm"/><button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ الأصل</button></form><section className="bg-white rounded-2xl p-4 border">{state.assets.length===0?<p className="text-sm text-slate-500">لا توجد أصول.</p>:state.assets.map(asset=><div key={asset.id} className="flex justify-between border-b last:border-0 py-3 text-sm"><span>{asset.name}</span><strong>{asset.currentValue.toLocaleString('ar-EG')} {cur}</strong></div>)}</section></div>}

        {activeModule === 'savings' && <div className="space-y-4"><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(addSavingsGoal(state,{title:savTitle,targetAmount:savTarget}),'تم حفظ هدف التحويشة');setSavTitle('');setSavTarget('')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">هدف تحويشة</h2><div className="grid grid-cols-2 gap-2"><input required value={savTitle} onChange={e=>setSavTitle(e.target.value)} placeholder="اسم الهدف" className="border rounded-xl p-3 text-sm"/><input required type="number" min="0.01" value={savTarget} onChange={e=>setSavTarget(e.target.value)} placeholder="المبلغ المستهدف" className="border rounded-xl p-3 text-sm"/></div><button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ الهدف</button></form><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(contributeToSavingsGoal(state,savingGoalId,savingContribution),'تم تحديث التحويشة');setSavingContribution('')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">إضافة أو سحب من التحويشة</h2><div className="grid grid-cols-2 gap-2"><select required value={savingGoalId} onChange={e=>setSavingGoalId(e.target.value)} className="border rounded-xl p-3 text-sm"><option value="">اختر الهدف</option>{state.savingsGoals.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select><input required type="number" step="0.01" value={savingContribution} onChange={e=>setSavingContribution(e.target.value)} placeholder="موجب للإضافة / سالب للسحب" className="border rounded-xl p-3 text-sm"/></div><button className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold">حفظ الحركة</button></form><section className="bg-white rounded-2xl p-4 border">{state.savingsGoals.map(g=><div key={g.id} className="border-b last:border-0 py-3 text-sm"><div className="flex justify-between"><strong>{g.title}</strong><span>{g.currentAmount.toLocaleString('ar-EG')} / {g.targetAmount.toLocaleString('ar-EG')} {cur}</span></div><div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-teal-600" style={{width:`${Math.min(100,g.currentAmount/g.targetAmount*100)}%`}}/></div></div>)}</section></div>}

        {activeModule === 'attachments' && <div className="space-y-4"><form onSubmit={async e=>{e.preventDefault();try{await persistAndSet(addAttachmentMetadata(state,{title:attTitle,fileName:attFileName,mimeType:attachmentData.split(';')[0].replace('data:','')||'application/octet-stream',sizeBytes:attachmentData.length,linkedEntityType:'transaction',linkedEntityId:attachmentTxId||null,occurredAt:txDate,dataBase64:attachmentData}),'تم حفظ المرفق وربطه محليًا');setAttTitle('');setAttFileName('');setAttachmentData('')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">إرفاق إيصال أو مستند</h2><input required value={attTitle} onChange={e=>setAttTitle(e.target.value)} placeholder="عنوان المرفق" className="w-full border rounded-xl p-3 text-sm"/><select value={attachmentTxId} onChange={e=>setAttachmentTxId(e.target.value)} className="w-full border rounded-xl p-3 text-sm"><option value="">بدون ربط بعملية</option>{state.transactions.filter(t=>!t.isVoided).map(t=><option key={t.id} value={t.id}>{t.occurredAt} · {t.note||t.type}</option>)}</select><input required type="file" accept="image/*,application/pdf" className="w-full text-sm" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2*1024*1024){notify('error','الحد الأقصى للمرفق 2 ميجابايت');e.currentTarget.value='';return}const reader=new FileReader();reader.onload=()=>{setAttachmentData(String(reader.result));setAttFileName(file.name)};reader.onerror=()=>notify('error','تعذر قراءة المرفق');reader.readAsDataURL(file)}}/><p className="text-xs text-slate-500">يُحفظ المحتوى داخل البيانات المحلية والنسخة الاحتياطية. تجنب الملفات الكبيرة.</p><button disabled={!attachmentData||isSubmitting} className="touch-target w-full rounded-xl bg-teal-700 text-white p-3 font-bold disabled:opacity-50">حفظ المرفق</button></form><section className="bg-white rounded-2xl p-4 border">{state.attachments.length===0?<p className="text-sm text-slate-500">لا توجد مرفقات.</p>:state.attachments.map(att=><div key={att.id} className="border-b last:border-0 py-3 text-sm"><div className="flex justify-between gap-2"><strong>{att.title}</strong><span className="text-xs text-slate-500">{att.fileName}</span></div>{att.dataBase64&&<a download={att.fileName} href={att.dataBase64} className="text-xs text-teal-700 underline">فتح أو تنزيل المرفق</a>}</div>)}</section></div>}

        {activeModule === 'closing' && <div className="space-y-4"><form onSubmit={async e=>{e.preventDefault();if(!window.confirm('سيمنع الإقفال أي تعديل أو إلغاء لعمليات هذه الفترة وما قبلها. متابعة؟'))return;try{await persistAndSet(closeFinancialPeriod(state,{periodType:closingType,periodEnd:closingDate,notes:`إقفال ${closingType==='day'?'يومي':'شهري'} من الواجهة`}), 'تم إقفال الفترة وحفظ ملخصها')}catch(err:any){notify('error',err.message)}}} className="bg-white rounded-2xl p-5 border space-y-3"><h2 className="font-extrabold">إقفال يوم أو شهر</h2><div className="grid grid-cols-2 gap-2"><select value={closingType} onChange={e=>setClosingType(e.target.value as any)} className="border rounded-xl p-3 text-sm"><option value="day">إقفال يوم</option><option value="month">إقفال شهر</option></select><input type="date" value={closingDate} onChange={e=>setClosingDate(e.target.value)} className="border rounded-xl p-3 text-sm"/></div><p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl">التصحيح بعد الإقفال يتم بقيد جديد في تاريخ مفتوح، ولا يتم تعديل القيد المقفل أو حذفه.</p><button className="touch-target w-full rounded-xl bg-amber-700 text-white p-3 font-bold">تأكيد الإقفال</button></form><section className="bg-white rounded-2xl p-4 border"><h2 className="font-extrabold mb-3">الفترات المقفلة</h2>{state.periodClosings.length===0?<p className="text-sm text-slate-500">لا توجد فترات مقفلة.</p>:state.periodClosings.map(item=><div key={item.id} className="border-b last:border-0 py-3 text-sm"><strong>{item.periodType==='day'?'يومي':'شهري'} حتى {item.periodEnd}</strong><div className="text-xs text-slate-500">دخل {item.totalIncomeSnapshot.toLocaleString('ar-EG')} · مصروف {item.totalExpenseSnapshot.toLocaleString('ar-EG')} {cur}</div></div>)}</section></div>}

        {/* ALL OTHER MODULES: honest live summaries, not false claims of full workflows */}
        {activeModule !== 'dashboard' && activeModule !== 'accounts' && activeModule !== 'transactions' && activeModule !== 'income_expense' && activeModule !== 'transfers' && activeModule !== 'categories' && activeModule !== 'backup' && activeModule !== 'budgets_reports' && activeModule !== 'settings' && activeModule !== 'projects' && activeModule !== 'tasks' && activeModule !== 'workers' && activeModule !== 'purchases' && activeModule !== 'inventory' && activeModule !== 'assets' && activeModule !== 'savings' && activeModule !== 'attachments' && activeModule !== 'closing' && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-3"><h2 className="font-bold text-base text-slate-900">{currentModuleTitle}</h2><p className="text-sm text-slate-600">هذه الوحدة ما زالت تحتاج إلى استكمال واجهات الإدخال والتعديل التفصيلية. البيانات المحفوظة فيها لا تُعرض هنا على أنها وظائف مكتملة.</p><div className="grid grid-cols-2 gap-3">{activeModule === 'tasks' && <><div className="rounded-xl bg-slate-50 p-3"><strong>{state.tasks.length}</strong><p className="text-xs">إجمالي المهام</p></div><div className="rounded-xl bg-emerald-50 p-3"><strong>{state.tasks.filter(t=>t.isCompleted).length}</strong><p className="text-xs">مهام مكتملة</p></div></>}{activeModule === 'workers' && <><div className="rounded-xl bg-slate-50 p-3"><strong>{state.workers.length}</strong><p className="text-xs">عدد العمال</p></div><div className="rounded-xl bg-amber-50 p-3"><strong>{state.workers.reduce((n,w)=>n+w.remainingPayable,0).toLocaleString('ar-EG')} {cur}</strong><p className="text-xs">مستحقات العمال</p></div></>}{activeModule === 'purchases' && <><div className="rounded-xl bg-slate-50 p-3"><strong>{state.suppliers.length}</strong><p className="text-xs">الموردون</p></div><div className="rounded-xl bg-amber-50 p-3"><strong>{state.suppliers.reduce((n,s)=>n+s.balanceDue,0).toLocaleString('ar-EG')} {cur}</strong><p className="text-xs">مستحق للموردين</p></div></>}{activeModule === 'inventory' && <><div className="rounded-xl bg-slate-50 p-3"><strong>{state.inventoryItems.length}</strong><p className="text-xs">أصناف المخزون</p></div><div className="rounded-xl bg-rose-50 p-3"><strong>{state.inventoryItems.filter(i=>i.quantity<=i.minQuantity).length}</strong><p className="text-xs">أصناف عند حد التنبيه</p></div></>}{activeModule === 'assets' && <><div className="rounded-xl bg-slate-50 p-3"><strong>{state.assets.length}</strong><p className="text-xs">الأصول المسجلة</p></div><div className="rounded-xl bg-slate-50 p-3"><strong>{state.assets.reduce((n,a)=>n+a.currentValue,0).toLocaleString('ar-EG')} {cur}</strong><p className="text-xs">القيمة الحالية</p></div></>}</div><button type="button" onClick={()=>setActiveModule('dashboard')} className="touch-target rounded-xl border px-4 py-2 font-bold">العودة للرئيسية</button></div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (5 Primary Destinations + Drawer Trigger) */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 shadow-lg z-30">
        <div className="max-w-3xl mx-auto grid grid-cols-5 text-center">
          {(
            [
              { id: 'dashboard', label: 'الرئيسية' },
              { id: 'accounts', label: 'الحسابات' },
              { id: 'transactions', label: 'العمليات' },
              { id: 'projects', label: 'المشاريع' },
              { id: 'backup', label: 'النسخ الاحتياطي' },
            ] as { id: ModuleId; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveModule(tab.id)}
              className={`touch-target py-2.5 text-xs font-bold ${
                activeModule === tab.id
                  ? 'text-teal-700 border-t-2 border-teal-700 bg-teal-50/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
