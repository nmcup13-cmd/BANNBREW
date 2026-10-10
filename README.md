# บ้านบรู Dashboard

🌐 **เว็บจริง: https://bannbrew.vercel.app** · ดูแบบไม่ต้องล็อกอิน: https://bannbrew.vercel.app/?demo · สำรองบน Firebase: https://bann-abf3f.web.app

Dashboard ยอดขายร้านกาแฟบ้านบรู 5 สาขา สร้างด้วย React + Vite + Tailwind + Recharts และ Firebase (Firestore, Authentication) ขึ้นเว็บด้วย Vercel ซึ่ง deploy ใหม่อัตโนมัติทุกครั้งที่ merge เข้า `main`

## หน้าในแอป

| แท็บ | ทำอะไร |
|---|---|
| Dashboard | สรุปยอดขายจากไฟล์ CSV: KPI, ยอดขายรายวัน, เมนูขายดี, ยอดตามสาขาและช่วงเวลา |
| ลูกค้า / Lab ลูกค้า | วิเคราะห์ข้อมูลลูกค้า |
| Lab 2.2 | กราฟแย่ 5 แบบเทียบกับกราฟที่ซ่อมแล้ว (`src/lab2/FixedCharts.jsx`) |
| สด · Firestore | Dashboard แบบ real-time จาก Firestore + ฟอร์มบันทึกยอดขาย (ต้องล็อกอินด้วย Google) |
| ลูกค้า & เมนู | RFM แบ่งกลุ่มลูกค้า + รายชื่อและดาวน์โหลด CSV (มีคำเตือน PDPA), Cohort การกลับมาซื้อซ้ำ, ABC/Pareto ของเมนู |
| พยากรณ์ & ผิดปกติ | พยากรณ์ 28 วัน, ควรเตรียมของเท่าไร, สรุปรายปีและความเสี่ยงรายสาขา, วันที่ยอดผิดปกติ (คลิกแล้วซูม) |
| ทดสอบ Rules | ลองโจมตีฐานข้อมูลของตัวเองเพื่อตรวจ Security Rules |

## งานแต่ละ Lab

📘 คู่มือทบทวน Day 4 (แนวคิด ตัวเลขจริง คำสั่ง ปัญหาที่เจอ): [`DAY4_REVIEW.md`](DAY4_REVIEW.md)

- **Lab 2.2 · ซ่อมกราฟแย่:** `src/lab2/FixedCharts.jsx` และใบงาน [`LAB2_WORKSHEET.md`](LAB2_WORKSHEET.md)
- **Lab 3.1 · นำข้อมูลเข้า Firestore:** `scripts/seedTransform.mjs` (ข้อมูล 90 วันล่าสุด 9,704 เอกสาร)
- **Lab 3.2 · Dashboard real-time และฟอร์ม:** `src/lab3/saleModel.js`, `src/lab3/LiveTab.jsx`, `src/lab3/SaleForm.jsx`
- **Lab 3.3 · Login และ Security Rules:** ล็อกอินด้วย Google ใน `LiveTab.jsx`, [`firestore.rules`](firestore.rules)
- **Lab 4.1 · RFM:** `src/lib/analytics/rfm.js` · Champions 455 คน ทำยอด 39%, At Risk 521 คน ทำยอด 27%
- **Lab 4.2 · Cohort, ABC และ pipeline:** `src/lib/analytics/cohort.js`, `scripts/build-analytics.mjs` · เมนูกลุ่ม A 25 เมนู = 80.3%
- **Lab 4.3 · รีวิว:** เพิ่มคำเตือน PDPA ก่อนดาวน์โหลดรายชื่อลูกค้า
- **Lab 4.4 · พยากรณ์:** `src/lib/analytics/forecast.js` · ย้อนทดสอบ 28 วัน สีลมคลาดเคลื่อน 28.2% เทียบค่าเฉลี่ยเส้นตรง 78.0%
  - ขยายเอง: การ์ด "ควรเตรียมของเท่าไร" และ "สรุปปี 2568 · ความเสี่ยงรายสาขา" (`src/lib/analytics/branchRisk.js`)
- **Lab 4.5 · วันผิดปกติ:** `src/lib/analytics/anomaly.js` · 3 อันดับแรก สยาม +277%, บางนา −97%, สีลม −91%
- **Lab 4.6 · อัปเดตอัตโนมัติ:** [`.github/workflows/analytics.yml`](.github/workflows/analytics.yml) รันทุกวัน 06:15 น.

## รันในเครื่อง

```bash
npm install
cp .env.example .env    # ใส่ค่าจาก Firebase console → Project settings → Your apps
npm run dev             # เปิด http://localhost:5173 (หรือ /?demo ไม่ต้องใช้ Firebase)
npm test                # test ทั้งหมด 72 ข้อ
```

คำสั่งข้อมูล (ต้องมี service account key ที่ `secrets/service-account.json`)

```bash
npm run seed:dry        # Lab 3: ดูผลก่อน ยังไม่เขียนจริง
npm run seed            # Lab 3: นำยอดขายเข้า Firestore
npm run verify-import   # Lab 3: ตรวจว่าข้อมูลใน Firestore ตรงกับที่นำเข้า
npm run analytics:dry   # Lab 4: คำนวณผลวิเคราะห์ 5 เอกสาร ยังไม่เขียน
npm run analytics       # Lab 4: เขียนผลวิเคราะห์ลง analytics/ ใน Firestore
```

## Deploy

- **เว็บ:** merge เข้า `main` แล้ว Vercel จะ build และขึ้นเว็บเอง · ตัวแปร `VITE_FIREBASE_*` ตั้งไว้ใน Vercel (Production + Preview)
- **ผลวิเคราะห์:** GitHub Actions รัน `scripts/build-analytics.mjs` ทุกวัน 06:15 น. (ใช้ secret `FIREBASE_SERVICE_ACCOUNT_JSON`) หรือกด **Actions → Build analytics → Run workflow**
- **Security Rules:** `firebase deploy --only firestore:rules`

- **เว็บสำรองบน Firebase Hosting** (https://bann-abf3f.web.app): ไม่อัปเดตเอง ต้อง deploy ทุกครั้งหลัง merge
  ```bash
  npm run build
  firebase deploy --only hosting
  ```

> ⚠️ ห้าม commit `.env`, โฟลเดอร์ `secrets/` หรือไฟล์ service account key (กันไว้ใน `.gitignore` แล้ว)
