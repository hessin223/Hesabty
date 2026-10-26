# حسابتي | Hesabty

تطبيق أندرويد محلي الأولوية (Android-First, Local-First) لإدارة الحسابات والمعاملات المالية الشخصية باللغة العربية (واجهة RTL كاملة).

## المبادئ الأساسية للمشروع (Core Architecture Principles)
1. **واجهة عربية أصيلة (Arabic RTL First):** تصميم متجاوب ومخصص للهواتف الذكية باللغة العربية.
2. **معمارية محلية بالكامل (Local-First & Offline-Ready):** يعمل التطبيق بدون الحاجة إلى اتصال بالإنترنت عبر قاعدة بيانات **SQLite** الأصلية على أندرويد (`@capacitor-community/sqlite`) مع طبقة توافق محلية للويب.
3. **عدم وجود بيانات مالية وهمية (Zero Fake Financial Records):** يبدأ التطبيق بقاعدة بيانات نظيفة تماماً (0 حسابات، 0 معاملات، 0 أرصدة).
4. **عناصر تحكم فعالة بالكامل (No Nonfunctional Controls):** جميع الأزرار والنماذج والفلاتر مرتبطة بمحرك الحسابات الفعلي.
5. **أمان المستودع (Zero Committed Secrets):** لا توجد أي مفاتيح سرية أو بيانات حساسة داخل الشفرة المصدرية.

## الحزمة التقنية (Tech Stack)
- **الواجهة الأمامية:** React 18 + TypeScript + Vite + Tailwind CSS
- **البيئة الأصلية لأندرويد:** Capacitor 6 (`@capacitor/core`, `@capacitor/android`)
- **التخزين المستمر:** `@capacitor-community/sqlite` + SQLite Relational Schema (`accounts`, `transactions`, `categories`, `settings`)
- **الاختبارات الآلية:** Node.js Native Test Runner (`npm test`) & Vitest
- **البناء السحابي للـ APK:** GitHub Actions (`.github/workflows/build-android-apk.yml`)

## هيكل المشروع (Project Structure)
```text
Hesabty/
├── .github/workflows/
│   └── build-android-apk.yml   # بناء ملف APK سحابياً عبر GitHub Actions
├── src/
│   ├── db/
│   │   ├── schema.ts           # مخطط جداول SQLite والتصنيفات الأساسية
│   │   └── storageAdapter.ts   # محول التخزين المحلي (Capacitor SQLite + Web Persistence)
│   ├── services/
│   │   └── ledgerCore.mjs      # محرك العمليات المحاسبية والتحقق الصارم من الأرصدة
│   ├── types/
│   │   └── models.ts           # تعريفات الأنواع (TypeScript Interfaces)
│   ├── App.tsx                 # واجهة التطبيق الرئيسية (RTL Mobile-First)
│   ├── main.tsx                # نقطة دخول التطبيق
│   └── index.css               # تنسيقات الواجهة والخطوط العربية
├── tests/
│   └── ledger.test.mjs         # اختبارات آلية شاملة لمحرك الحسابات
├── capacitor.config.ts         # إعدادات Capacitor لتطبيق أندرويد
├── package.json                # الاعتماديات وأوامر التشغيل والبناء
├── tsconfig.json               # إعدادات TypeScript
└── vite.config.mjs             # إعدادات Vite (ESM)
```

## التشغيل والاختبار محلياً (Local Development & Testing)
```bash
# 1. تثبيت الحزم
npm ci

# 2. تشغيل الاختبارات الآلية
npm test

# 3. تشغيل بيئة التطوير
npm run dev

# 4. بناء المشروع ومزامنة أندرويد
npm run build
npx cap add android
npx cap sync android
```

## البناء السحابي لتطبيق الأندرويد (Cloud APK Build via GitHub Actions)
عند دفع التغييرات إلى الفرع الرئيسي (`main`) على GitHub، يقوم ملف العمل `.github/workflows/build-android-apk.yml` تلقائياً بـ:
1. تثبيت Node.js 20 و Java JDK 17 و Android SDK.
2. تشغيل جميع الاختبارات الآلية (`npm test`).
3. بناء تطبيق الويب عبر Vite وتوليد مشروع أندرويد عبر Capacitor.
4. تجميع ملف `app-debug.apk` عبر Gradle ورفعه كمخرج (Artifact) باسم **`hesabty-android-debug-apk`**.
