# 🚀 QR SMART Scanner

**QR SMART Scanner** เว็บแอปพลิเคชันสแกน QR Code ยุคใหม่ ที่รวมความเร็ว (Speed) และประสบการณ์ผู้ใช้ (UX) เข้าด้วยกันอย่างลงตัว มาพร้อมดีไซน์ Dark Mode สุดพรีเมียมและระบบสถานะอัจฉริยะ

---

### ✨ คุณสมบัติหลัก (Key Features)

- 📸 **Dual Scanning Mode:** เลือกสแกนได้ทั้งจากกล้อง (Real-time) หรืออัปโหลดไฟล์ภาพ
- 💡 **Intelligent Status System:** ระบบไฟสถานะแบบวงกลม (Dynamic Status Dot)
  - 🟢 **Green Solid:** ระบบพร้อมสแตนด์บาย (Ready)
  - 🟢 **Green Pulsing:** กล้องกำลังทำงานและประมวลผล (Active)
  - 🟡 **Yellow Solid:** ตรวจพบข้อผิดพลาดหรือหาโค้ดไม่พบ (Warning)
- ⚡ **Haptic Feedback:** ระบบสั่นแจ้งเตือนทันทีเมื่อสแกนสำเร็จ (Vibration API)
- 🛡️ **Security Alert:** ระบบตรวจสอบลิงก์ก่อนเข้าถึงจริงผ่าน SweetAlert2
- 🖌️ **Modern UI:** เส้น Laser นำสายตาขณะสแกน และดีไซน์ที่รองรับทุกหน้าจอ (Responsive)

---

### 🛠 Tech Stack (เครื่องมือที่ใช้)

| Component        | Technology            | Badge                                                                                                                | Role                                                    |
| :--------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------ |
| **Markup**       | **HTML5**             | ![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)                   | โครงสร้าง Semantic, Video Display และ Canvas Rendering  |
| **Styling**      | **CSS3**              | ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)                      | Dark Theme, Laser Animation และระบบไฟสถานะอัจฉริยะ      |
| **Core Engine**  | **JavaScript (ES6+)** | ![JS](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)            | ควบคุม Logic, Camera Stream และระบบสั่น (Vibration API) |
| **Framework**    | **Bootstrap v5.3**    | ![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)       | จัดการ Layout แบบ Responsive และ Modern UI Components   |
| **QR Library**   | **Html5-QRCode**      | ![Library](https://img.shields.io/badge/Html5--QRCode-blue?style=for-the-badge&logo=github)                          | Engine หลักในการประมวลผลและถอดรหัส QR Code              |
| **Alert System** | **SweetAlert2**       | ![SweetAlert2](https://img.shields.io/badge/SweetAlert2-F8BB86?style=for-the-badge&logo=sweetalert2&logoColor=white) | จัดการระบบแจ้งเตือนและ Modal ที่เน้นประสบการณ์ผู้ใช้    |
| **Icons**        | **Bootstrap Icons**   | ![Icons](https://img.shields.io/badge/Icons-Bootstrap-7952B3?style=for-the-badge&logo=bootstrap)                     | ชุดไอคอน SVG คมชัดสำหรับปุ่มคำสั่งและ UI ต่างๆ          |

---

### 🚀 การติดตั้งและเริ่มต้นใช้งาน (Getting Started)

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/BazK006/qr-smart-scanner.git
    ```

2.  **Run the Project:**
    เปิดไฟล์ `index.html` บนเบราว์เซอร์ของคุณ หรือรันผ่านโปรแกรมจำลองเซิร์ฟเวอร์ เช่น **Live Server**

3.  **Usage:**
    - กดปุ่ม **"สแกน QR"** เพื่อเริ่มเปิดกล้อง (ต้องอนุญาตสิทธิ์เข้าถึงกล้องก่อน)
    - กดปุ่ม **"อัปโหลดรูปภาพ"** เพื่อวิเคราะห์ QR จากไฟล์ในเครื่อง

---

### 📂 โครงสร้างโปรเจกต์ (Project Structure)

```text
qr-smart-scanner
├── templates
│   └── index.html      # หน้าจอหลักของแอปพลิเคชัน (Entry Point)
├── static/
│   ├── css/            # จัดเก็บสไตล์ แอนิเมชันเลเซอร์ และ Dark Mode
│   ├── js/             # Logic การสแกน, Camera Control และระบบไฟสถานะ
│   └── images/         # ไฟล์กราฟิกและไอคอนที่ใช้ในหน้าเว็บ
├── .gitignore          # ละเว้นไฟล์ขยะของระบบ (OS Junk Files)
└── README.md           # คู่มือการใช้งานและรายละเอียดโปรเจกต์
```
