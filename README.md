# My Finance Dashboard

تطبيق ويب مالي شخصي تم تحويل بياناته الأولية من ملف Excel إلى واجهة متجاوبة تعمل على GitHub Pages، ويمكنها استخدام Firebase Authentication + Cloud Firestore للمزامنة السحابية.

## المزايا
- Dashboard ملخص مالي.
- المصروفات والمتبقي من المكافأة.
- الدائنون والبنزين.
- دخل مرن حسب الشهر مع الشفتات والساعات والمبالغ.
- جدول مكافآت الجامعة، حالة الاستلام، والعد التنازلي.
- إضافة، تعديل، حذف.
- Dark / Light mode.
- تصدير واستيراد JSON.
- LocalStorage تلقائيًا عند عدم تفعيل Firebase.
- Firebase Authentication وCloud Firestore عند إعداد المشروع.

## تشغيله على GitHub Pages
1. ارفع جميع الملفات إلى مستودع GitHub.
2. من Settings > Pages اختر النشر من Branch.
3. اختر `main` و `/root` ثم Save.

## ربط Firebase
1. أنشئ مشروع Firebase وسجّل Web App.
2. افتح `firebase-config.js` والصق قيم firebaseConfig.
3. من Authentication فعّل Email/Password.
4. أنشئ Firestore Database.
5. انشر قواعد Firestore الموجودة في `firestore.rules`.

باستخدام Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

للنشر أيضًا على Firebase Hosting:

```bash
firebase deploy --only hosting
```

> مهم: لا ترفع Service Account أو أي private key إلى GitHub. إعدادات Web App العادية ليست بديلًا عن قواعد Firestore الآمنة.
