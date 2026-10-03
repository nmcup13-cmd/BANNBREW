# Lab 3: Firebase แบบ real-time, Login, Security Rules และขึ้นเว็บ

คาบ 3 · เสาร์ 27 ก.ย. 2026 · 13.00–16.00 · ต่อจาก Lab 1 และ Lab 2

โปรเจกต์นี้คือ Dashboard เดิม (checkpoint หลัง Lab 2) ที่เพิ่มโครงสำหรับ Lab 3 ไว้ เริ่มจาก `LAB3_GUIDE.md`

```bash
npm install
npm test        # ตอนเริ่มจะไม่ผ่าน 20 ข้อ (failed + skipped) เป็นเรื่องปกติ
npm run dev
```

## ไฟล์ที่คุณจะสร้างหรือแก้ด้วย AI

| Lab | ไฟล์ | ตรวจด้วย |
|---|---|---|
| 3.1 | `scripts/seedTransform.mjs` | `npm test` แล้ว `npm run seed:dry` → `seed` → `verify-import` |
| 3.2 | `src/lab3/saleModel.js` | `npm test` |
| 3.2 | `src/lab3/LiveTab.jsx`, `src/lab3/SaleForm.jsx` | เทียบยอด 30 วันกับ `seed:dry -- --days=29` และทดสอบ 2 หน้าต่าง |
| 3.3 | Login ใน `LiveTab.jsx`, `firestore.rules` | แท็บ **ทดสอบ Rules** ✅ ครบ และฟอร์มยังบันทึกได้ |

## ไฟล์ที่ให้มาพร้อมใช้ (ไม่ต้องแก้)

| ไฟล์ | หน้าที่ |
|---|---|
| `scripts/seed.mjs` | นำเข้าข้อมูล: batch ครั้งละ 500, กันโควตา, ตรวจว่า key อยู่ใน `secrets/` และถูก gitignore |
| `scripts/verify-import.mjs` | ตรวจจำนวนและยอดขายใน Firestore ด้วย aggregation query (อ่านน้อยมาก) |
| `src/lab3/time.js` | เวลาไทยที่ถูกต้องไม่ว่าเครื่องตั้ง timezone อะไร |
| `src/lab3/firebase.js` | เชื่อมต่อ Firebase จาก `.env` |
| `src/lab3/RulesTester.jsx` | แท็บโจมตีฐานข้อมูลของตัวเอง 12 แบบ เพื่อตรวจ Security Rules |
| `*.test.js`, `*.test.mjs` | test ที่เป็นเฉลย **ห้ามแก้** |
| `firebase.json` | ตั้งค่า deploy rules และ hosting |
| `firestore.test-mode.rules` | ตัวอย่าง rules แบบเปิดหมด (ห้ามใช้จริง) ไว้เทียบ |

## ใช้โปรเจกต์ของตัวเองแทน

คัดลอก `src/lab3/`, `scripts/`, `firebase.json`, `firestore.rules`, `.env.example` และบรรทัดส่วน Firebase ใน `.gitignore` ไปใส่ในโปรเจกต์ Lab 2 ของคุณ แล้วติดตั้ง
```bash
npm install firebase
npm install -D firebase-admin vitest
```
เพิ่ม scripts ใน `package.json` ตามไฟล์นี้ และให้ AI เพิ่มแท็บ “สด · Firestore” (`LiveTab`) กับ “ทดสอบ Rules” (`RulesTester`) ใน `App.jsx`
