
# تطوير النظام إلى مستوى أنظمة المطاعم العالمية

سأنفّذ الطلب على **5 مراحل متتابعة**، كل مرحلة تُختبر وتُعتمد قبل الانتقال للتالية. لا شيء من قاعدة البيانات الحالية سيُحذف؛ فقط إضافات وتوسعات.

---

## المرحلة 1 — نظام الأدوار والصلاحيات + Super Owner

### قاعدة البيانات

- توسيع enum `app_role` ليشمل: `owner`, `manager`, `cashier`, `accountant`, `warehouse`, `waiter`, `kitchen` (بالإضافة للموجود).
- جدول جديد `permissions` (كتالوج مرجعي) + `role_permissions` (ربط دور بصلاحية) لدعم **Custom Roles**.
- جدول `custom_roles` (اسم الدور المخصص + tenant_id).
- علم `is_super_owner` على `user_roles` أو جدول منفصل `super_owners` — لا يمكن لأحد تعديله إلا Super Owner نفسه (سياسة RLS صارمة).
- دوال `has_permission(user, permission_key)` و `is_super_owner(user)` — SECURITY DEFINER لتجنب recursion.
- سياسات RLS محدَّثة لكل الجداول الحالية: Super Owner يرى كل شيء عبر كل الـ tenants.

### الواجهات
- `/admin/roles` — إدارة الأدوار والصلاحيات (Super Owner فقط).
- `/admin/super-owner` — تعيين/إزالة Super Owner (بحماية مضاعفة).

---

## المرحلة 2 — نظام المستخدمين الاحترافي + Profile

### قاعدة البيانات
- توسيع `profiles`: `username`, `phone`, `avatar_url`, `is_active`, `last_login_at`, `branch_id` (الفرع الأساسي).
- Trigger لتحديث `last_login_at` عبر server function عند login.
- سياسات: المستخدم يعدّل ملفه الشخصي، المالك/المدير يعدّل ملفات فرعه، Super Owner يعدّل الكل.

### Server Functions (بـ `requireSupabaseAuth` + فحص صلاحية)
- `createUser` — ينشئ حساب + profile + role + يعيّن الفرع (يستخدم `supabaseAdmin` داخل handler).
- `updateUserPassword` — تغيير كلمة مرور أي مستخدم (Super Owner/Manager).
- `toggleUserStatus` — تفعيل/إيقاف.
- `transferUserToBranch` — نقل بين الفروع.

### الواجهات
- `/users` (تحديث) — جدول احترافي: صورة، اسم، دور، فرع، حالة، آخر دخول، إجراءات.
- `/users/new` و `/users/$id` — نموذج كامل مع رفع صورة.
- `/profile` — صفحة الملف الشخصي (صورة، تغيير كلمة مرور، سجل نشاطاتي).

---

## المرحلة 3 — كتالوجات الفروع/الأقسام/المنتجات + Storage للصور

### قاعدة البيانات
- توسيع `branches`: `image_url`, `logo_url`, `description`, `working_hours` (jsonb), `manager_id`, `is_active`.
- توسيع `categories`: `image_url`, `description`, `sort_order`, `icon`, `is_active`.
- توسيع `products`: `image_url`, `gallery_urls` (text[]), `cost_price` (موجود؟)، `discount`, `ingredients` (text[]), `size`, `addons` (jsonb), `barcode`, `is_active`.
- جدول `customers` جديد: `name`, `phone`, `avatar_url`, `notes`, `tenant_id` + سياسات RLS + GRANT.
- توسيع `suppliers`: `logo_url`.

### Storage
استخدام bucket `restaurant-assets` الموجود (private):
- مجلدات: `avatars/`, `products/`, `categories/`, `branches/`, `suppliers/`, `customers/`.
- سياسات `storage.objects`: القراءة للمستخدمين المصادَق عليهم داخل نفس tenant، الرفع للأدوار المناسبة.
- Server function `getSignedUrl` لعرض الصور عبر signed URLs.

### الواجهات
- `/branches` (تحديث) — بطاقات مع صور، محرر ساعات العمل، تعيين مدير.
- `/categories` (تحديث) — عرض شبكي بأيقونات وصور، سحب-وإفلات للترتيب.
- `/products` (تحديث) — بطاقات احترافية، معرض صور، إضافات ومكونات.
- `/customers` — جديد بالكامل.
- `/suppliers` (تحديث) — إضافة صورة وربط بالفواتير.

---

## المرحلة 4 — Audit Log + Dashboard المالك

### قاعدة البيانات
- جدول `audit_logs`: `tenant_id`, `user_id`, `action`, `entity_type`, `entity_id`, `changes` (jsonb — before/after)، `ip_address`, `created_at`.
- Trigger عام `log_changes()` يُطبَّق على الجداول الحساسة (products, users, sales, expenses, purchases, branches).
- View `dashboard_owner_stats` تجمع KPIs (فروع، مستخدمون، مبيعات، أرباح، مصروفات، top products).

### الواجهات
- `/audit-logs` — سجل قابل للفلترة (مستخدم، نوع، تاريخ).
- `/dashboard` (إعادة بناء لـ Super Owner) — نظرة شاملة على كل الفروع + رسوم Recharts.

---

## المرحلة 5 — البيانات التجريبية (Demo Data) + فحص جاهزية

### Migration واحدة للبيانات
- 3 فروع (رئيسي، المدينة، المطار) بصور من Unsplash/Pexels URLs.
- 8 أقسام مع أيقونات ووصف.
- ~25 منتج موزَّع على الأقسام مع صور.
- 5 مستخدمين تجريبيين (Owner/Manager/Cashier/Accountant/Warehouse) بكلمات مرور افتراضية.
- 10 عملاء + 5 موردين.
- كميات مخزون افتراضية + حركات دخول/خروج.
- ~20 فاتورة مبيعات على آخر 30 يوماً بطرق دفع متنوعة (لتغذية الرسوم).

### تقرير الجاهزية النهائي
- فحص أمني عبر `security--run_security_scan`.
- تحقق من RLS على كل جدول جديد.
- اختبار Playwright: تسجيل دخول بكل دور، رفع صورة، عملية بيع كاملة، عرض التقارير.
- تقرير مكتوب: ما تم/ما تبقى/ملاحظات أمنية.

---

## تنبيهات مهمة

- **الحجم:** كل مرحلة قد تتجاوز حدود الجلسة الواحدة. سأنفّذ مرحلة كاملة ثم أتوقف لك للاختبار قبل التالية.
- **الحفاظ على الحالي:** لن أُسقط أي جدول أو سياسة موجودة؛ فقط `ALTER` و `CREATE`.
- **Super Owner:** سيتم تعيينه بأول migration للمستخدم الذي تحدّده (أو أول مستخدم موجود في `profiles`).
- **الصور التجريبية:** روابط خارجية مجانية (Unsplash) بدل رفعها فعلياً لتوفير الوقت؛ يمكن استبدالها لاحقاً.

---

هل أبدأ بـ **المرحلة 1** الآن؟ وإن كان لديك مستخدم محدَّد ليكون Super Owner، أعطني بريده الإلكتروني.
