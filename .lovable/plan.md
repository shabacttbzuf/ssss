## المرحلة 6 (الأخيرة) — نظام الموارد البشرية + إعادة بناء POS + الفحص الشامل

سأنفّذ هذه المرحلة على 3 محاور متكاملة، ثم فحص شامل نهائي قبل التسليم.

---

### المحور 1 — نظام الموارد البشرية (HR) الاحترافي

**قاعدة البيانات (Migration واحدة):**

- `employees` — يمتد `profiles`: `employee_no`, `job_title`, `department`, `branch_id`, `hire_date`, `contract_type` (full_time/part_time/contract/hourly), `base_salary`, `hourly_rate`, `bank_account`, `national_id`, `emergency_contact`, `status` (active/suspended/terminated), `termination_date`, `notes`.
- `leave_types` — كتالوج: `name`, `days_per_year`, `is_paid`, `requires_approval`, `color`.
- `leave_requests` — `employee_id`, `leave_type_id`, `start_date`, `end_date`, `days_count`, `reason`, `status` (pending/approved/rejected), `approved_by`, `approved_at`, `rejection_reason`.
- `attendance` — `employee_id`, `date`, `check_in`, `check_out`, `hours_worked`, `is_late`, `status` (present/absent/leave/holiday).
- `bonuses` — `employee_id`, `amount`, `reason`, `bonus_type` (performance/eid/annual/other), `paid_date`, `payroll_id`.
- `deductions` — `employee_id`, `amount`, `reason`, `deduction_type` (absence/late/advance/insurance/other), `applied_date`, `payroll_id`.
- `payroll_runs` — `tenant_id`, `month`, `year`, `branch_id`, `total_gross`, `total_net`, `total_deductions`, `total_bonuses`, `status` (draft/approved/paid), `approved_by`, `paid_at`.
- `payroll_items` — `payroll_run_id`, `employee_id`, `base_salary`, `bonuses_total`, `deductions_total`, `overtime`, `gross`, `net`, `notes`.
- دالة `calculate_employee_payroll(emp_id, month, year)` — تجمع الأساسي + المكافآت + الحسميات + الحضور.
- سياسات RLS: المدير يرى موظفي فرعه، المالك يرى الكل، الموظف يرى بياناته فقط، Super Owner كل شيء.
- GRANTs كاملة لكل جدول.

**Server Functions:**
- `runMonthlyPayroll(month, year, branch_id?)` — يحسب الرواتب لكل الموظفين النشطين ويُنشئ `payroll_run` + `payroll_items`.
- `approvePayroll(id)` / `markPayrollPaid(id)`.
- `approveLeaveRequest(id)` / `rejectLeaveRequest(id, reason)`.

**الواجهات (6 صفحات جديدة):**
- `/hr/employees` — قائمة موظفين مع فلترة بالفرع/الحالة، بطاقات احترافية.
- `/hr/employees/$id` — ملف الموظف الكامل: بيانات، عقد، حضور، إجازات، مكافآت/حسميات، تاريخ الرواتب.
- `/hr/leaves` — طلبات الإجازات (كل الموظفين للمدير، الخاصة للموظف) مع الموافقة/الرفض.
- `/hr/attendance` — سجل الحضور اليومي + تسجيل يدوي.
- `/hr/bonuses-deductions` — إدارة المكافآت والحسميات.
- `/hr/payroll` — إنشاء دورة رواتب شهرية، مراجعة، اعتماد، طباعة قسائم راتب PDF.

**السايدبار:** مجموعة جديدة "الموارد البشرية" تضم الروابط أعلاه.

---

### المحور 2 — إعادة بناء صفحة نقطة البيع (POS)

Layout جديد ثلاثي احترافي (مستوحى من Toast/Square/Lightspeed):

```
┌─────────────────────────────────────────────────────────┐
│  Header: الفرع • الكاشير • جلسة الصندوق • بحث           │
├──────────────┬────────────────────────┬─────────────────┤
│              │                        │                 │
│  الأقسام     │   منتجات القسم         │   الفاتورة      │
│  (Grid       │   (Grid بطاقات         │   (Cart بنود    │
│   عمودي      │    بصور، سعر،          │    مع + / -     │
│   بأيقونات)  │    مخزون)              │    زر حذف       │
│              │                        │    خصم/ضريبة    │
│  22%         │   48%                  │    30%          │
│              │                        │                 │
│              │                        │  زر دفع كبير    │
└──────────────┴────────────────────────┴─────────────────┘
```

- **قسم الأقسام (يمين/يسار):** بطاقات كبيرة قابلة للنقر بأيقونة + اسم؛ اختيار قسم يُصفّي المنتجات.
- **قسم المنتجات (وسط):** شبكة بطاقات (صورة، اسم، سعر، شارة مخزون)؛ نقر يضيف للفاتورة؛ بحث نصي علوي.
- **قسم الفاتورة (يسار/يمين):** جدول احترافي (الاسم + الكمية بأزرار +/- + السعر + الإجمالي + زر حذف 🗑️)؛ ملخّص أسفل (الفرعي، الخصم، الضريبة، الإجمالي)؛ اختيار طريقة الدفع؛ زر "إتمام البيع" بارز.
- تصميم موبايل: تبويبات (Categories / Products / Cart) بنقرة واحدة.
- كل الأزرار بألوان دلالية من design tokens (بدون hardcoded colors).

---

### المحور 3 — الفحص الشامل النهائي

1. **`supabase--linter`** — فحص RLS و search_path لكل الدوال الجديدة.
2. **`security--run_security_scan`** — فحص أمني كامل.
3. **`tsgo`** — فحص TypeScript.
4. **Playwright end-to-end:**
   - تسجيل دخول → إنشاء موظف → طلب إجازة → موافقة → تشغيل دورة رواتب → طباعة قسيمة.
   - فتح POS → اختيار قسم → إضافة منتجات → تعديل كميات → حذف بند → إتمام بيع → طباعة فاتورة.
   - screenshots في كل خطوة رئيسية للتحقق البصري.
5. **تقرير جاهزية مكتوب** يشمل:
   - قائمة الميزات المكتملة.
   - أي تحذيرات أمنية متبقية (مع الشرح).
   - خطوات التشغيل (كيف يبدأ المستخدم).
   - قائمة "ما يمكن إضافته لاحقاً" (تحسينات مستقبلية).

---

### التفاصيل التقنية

- كل الجداول الجديدة: `tenant_id UUID NOT NULL` + `id` + `created_at` + `updated_at` + `set_updated_at` trigger + GRANTs (`authenticated` + `service_role`) + RLS.
- سياسات RLS تعتمد على `has_role`/`has_permission`/`is_super_owner` + فحص فرع (لمنع مدير من رؤية موظفي فرع آخر).
- Audit log trigger يُطبَّق على `employees`, `payroll_runs`, `leave_requests`, `bonuses`, `deductions`.
- إضافة صلاحيات جديدة للـ enum: `hr.view`, `hr.manage`, `payroll.run`, `payroll.approve`, `leaves.approve`.
- كل الأموال بـ `NUMERIC(12,2)` مع `formatMoney` من `@/lib/format`.
- POS يبقى يستخدم نفس منطق `sales` + `sale_items` + trigger `on_sale_item_insert` الحالي — تصميم جديد فقط، لا كسر خلفي.

---

### تحذيرات

- هذه المرحلة كبيرة (migration واحدة كبيرة + ~10 ملفات جديدة + إعادة كتابة POS). سأنفّذها على دفعة واحدة ثم أتوقف للفحص.
- لن أحذف أي جدول أو سياسة قائمة.
- قسائم الراتب PDF ستستخدم نفس أداة `invoice-pdf.ts` بقالب مخصص.
- الفحص الشامل سيتم في نفس الجلسة بعد اكتمال البناء.

---

هل أبدأ التنفيذ؟