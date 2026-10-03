# บ้านบรู Dashboard

🌐 **เว็บจริง: https://bann-abf3f.web.app**

Dashboard ยอดขายร้านกาแฟบ้านบรู 5 สาขา สร้างด้วย React + Vite + Tailwind + Recharts และ Firebase (Firestore, Authentication, Hosting)

## หน้าในแอป

| แท็บ | ทำอะไร |
|---|---|
| Dashboard | สรุปยอดขายจากไฟล์ CSV: KPI, ยอดขายรายวัน, เมนูขายดี, ยอดตามสาขาและช่วงเวลา |
| ลูกค้า / Lab ลูกค้า | วิเคราะห์ข้อมูลลูกค้า |
| Lab 2.2 | กราฟแย่ 5 แบบเทียบกับกราฟที่ซ่อมแล้ว (`src/lab2/FixedCharts.jsx`) |
| สด · Firestore | Dashboard แบบ real-time จาก Firestore + ฟอร์มบันทึกยอดขาย (ต้องล็อกอินด้วย Google) |
| ทดสอบ Rules | ลองโจมตีฐานข้อมูลของตัวเองเพื่อตรวจ Security Rules |

## งานแต่ละ Lab

- **Lab 2.2 · ซ่อมกราฟแย่:** `src/lab2/FixedCharts.jsx` และใบงาน [`LAB2_WORKSHEET.md`](LAB2_WORKSHEET.md)
- **Lab 3.1 · นำข้อมูลเข้า Firestore:** `scripts/seedTransform.mjs` (ข้อมูล 90 วันล่าสุด 9,704 เอกสาร)
- **Lab 3.2 · Dashboard real-time และฟอร์ม:** `src/lab3/saleModel.js`, `src/lab3/LiveTab.jsx`, `src/lab3/SaleForm.jsx`
- **Lab 3.3 · Login, Security Rules และขึ้นเว็บ:** ล็อกอินด้วย Google ใน `LiveTab.jsx`, [`firestore.rules`](firestore.rules), Firebase Hosting

## รันในเครื่อง

```bash
npm install
cp .env.example .env    # ใส่ค่าจาก Firebase console → Project settings → Your apps
npm run dev             # เปิด http://localhost:5173
npm test                # test ของ Lab 3 (24 ข้อ)
```

คำสั่งนำเข้าข้อมูล (ต้องมี service account key ที่ `secrets/service-account.json`)

```bash
npm run seed:dry        # ดูผลก่อน ยังไม่เขียนจริง
npm run seed            # นำเข้าข้อมูลเข้า Firestore
npm run verify-import   # ตรวจว่าข้อมูลใน Firestore ตรงกับที่นำเข้า
```

## Deploy

```bash
npm run build
npx firebase-tools deploy --only firestore:rules,hosting
```

> ⚠️ ห้าม commit `.env`, โฟลเดอร์ `secrets/` หรือไฟล์ service account key (กันไว้ใน `.gitignore` แล้ว)
