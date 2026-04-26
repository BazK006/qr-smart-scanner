const html5QrCode = new Html5Qrcode("reader");
let isRunning = false;

const btnToggle = document.getElementById('btn-toggle');
const btnText = document.getElementById('btn-text');
const laser = document.getElementById('laser');
const info = document.getElementById('info');
const statusLog = document.getElementById('status-log');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const btnClosePreview = document.getElementById('btn-close-preview');
const statusDot = document.getElementById('status-dot');

function resetUIState() {
    info.innerHTML = `<span class="text-secondary opacity-75">วาง QR Code ให้อยู่ในกรอบสแกน</span>`;
    statusLog.innerText = isRunning ? "กำลังสแกน..." : "พร้อมใช้งาน";
    statusDot.className = isRunning ? 'status-dot-active me-1' : 'status-dot-ready me-1';
}

function onScanSuccess(decodedText) {
    if (navigator.vibrate) navigator.vibrate(150);
    statusLog.innerText = "พบข้อมูลในระบบ";

    laser.style.display = 'none';

    if (decodedText.startsWith('http')) {
        info.innerHTML = `<span class="text-success fw-bold" style="animation: pulse 1s infinite;">✅ สแกนสำเร็จ! พบลิงก์เว็บไซต์</span>`;

        Swal.fire({
            title: 'เจอลิงก์แล้ว!',
            text: decodedText,
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'เปิดลิงก์นี้',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#0ea5e9',
            cancelButtonColor: '#374151',
            background: '#111827',
            color: '#fff',
            backdrop: `rgba(14, 165, 233, 0.2)`
        }).then((result) => {
            laser.style.display = isRunning ? 'block' : 'none';
            if (result.isConfirmed) {
                window.location.href = decodedText;
            } else {
                resetUIState();
            }
        });
    } else {
        Swal.fire({
            title: 'ผลการสแกน',
            text: decodedText,
            icon: 'info',
            confirmButtonColor: '#0ea5e9',
            background: '#111827',
            color: '#fff'
        }).then(() => {
            laser.style.display = isRunning ? 'block' : 'none';
            resetUIState();
        });
    }
}

async function toggleCamera() {
    if (isRunning) {
        await html5QrCode.stop();
        btnText.innerText = "เปิดสแกน QR";
        btnToggle.classList.replace('btn-scan-stop', 'btn-scan-start');
        laser.style.display = 'none';
        isRunning = false;
        resetUIState();
    } else {
        html5QrCode.start(
            { facingMode: "environment" },
            { fps: 20, qrbox: { width: 250, height: 250 } },
            onScanSuccess
        ).then(() => {
            btnText.innerText = "ปิดสแกน QR";
            btnToggle.classList.replace('btn-scan-start', 'btn-scan-stop');
            laser.style.display = 'block';
            isRunning = true;
            statusLog.innerText = "กำลังสแกน...";
            statusDot.className = 'status-dot-active me-1';
            previewContainer.classList.add('d-none');
        }).catch(err => {
            statusLog.innerText = "ไม่สามารถเปิดกล้องได้";
            statusDot.className = 'status-dot-standby me-1';
            Swal.fire({
                title: 'เกิดข้อผิดพลาด',
                text: 'กรุณาอนุญาตให้แอปเข้าถึงกล้องของคุณ',
                icon: 'error',
                confirmButtonColor: '#ef4444',
                background: '#111827',
                color: '#fff'
            });
        });
    }
}

fileInput.addEventListener('change', async e => {
    if (e.target.files.length === 0) return;

    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        previewImage.src = event.target.result;
        previewContainer.classList.remove('d-none');
    };
    reader.readAsDataURL(file);

    if (isRunning) await toggleCamera();

    statusLog.innerText = "กำลังวิเคราะห์ภาพ...";
    statusDot.className = 'status-dot-active me-1';

    Swal.fire({
        title: 'กำลังอ่านไฟล์...',
        allowOutsideClick: false,
        background: '#111827',
        color: '#fff',
        didOpen: () => { Swal.showLoading(); }
    });

    html5QrCode.scanFile(file, true)
        .then(result => {
            Swal.close();
            onScanSuccess(result);
        })
        .catch(err => {
            Swal.close();
            statusLog.innerText = "สแกนไม่สำเร็จ ลองใหม่อีกครั้ง";
            statusDot.className = 'status-dot-standby me-1';
            Swal.fire({
                title: 'ไม่พบ QR Code',
                text: 'โปรดเลือกรูปภาพที่ชัดเจน หรือวางตำแหน่งให้ตรงกลาง',
                icon: 'warning',
                confirmButtonColor: '#0ea5e9',
                background: '#111827',
                color: '#fff'
            }).then(() => {
                resetUIState();
            });
        });
});

btnClosePreview.addEventListener('click', () => {
    previewContainer.classList.add('d-none');
    previewImage.src = "";
    fileInput.value = "";

    try { html5QrCode.clear(); } catch (err) { }

    info.innerHTML = `<span class="text-secondary opacity-75">วาง QR Code ให้อยู่ในกรอบสแกน</span>`;

    if (isRunning) {
        statusLog.innerText = "กำลังสแกน...";
        statusDot.className = 'status-dot-active me-1';
    } else {
        statusLog.innerText = "ระบบพร้อมใช้งาน";
        statusDot.className = 'status-dot-ready me-1';
    }

    if (!isRunning) {
        const readerDiv = document.getElementById('reader');
        readerDiv.querySelectorAll('img, canvas').forEach(node => node.remove());
    }
    resetUIState();
});