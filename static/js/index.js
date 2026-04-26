const html5QrCode = new Html5Qrcode("reader");
let isRunning = false;
let isTransitioning = false;

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
    info.innerHTML = `<span class="text-secondary opacity-75">วาง QR Code ในหน้าจอเพื่อเริ่มสแกน</span>`;
    statusLog.innerText = isRunning ? "กำลังสแกน..." : "พร้อมใช้งาน";
    statusDot.className = isRunning ? 'status-dot-active me-1' : 'status-dot-ready me-1';
}

function closePreview() {
    previewContainer.classList.add('d-none');
    previewImage.src = "";
    fileInput.value = "";
}

function onScanSuccess(decodedText) {
    if (navigator.vibrate) navigator.vibrate(150);
    statusLog.innerText = "พบข้อมูล";
    laser.style.display = 'none';

    if (decodedText.startsWith('http')) {
        info.innerHTML = `<span class="text-success fw-bold" style="animation: pulse 1s infinite;">✅ สแกนสำเร็จ!</span>`;

        Swal.fire({
            title: 'พบลิงก์เว็บไซต์',
            text: decodedText,
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: 'เปิดลิงก์',
            cancelButtonText: 'ปิด',
            confirmButtonColor: '#0ea5e9',
            cancelButtonColor: '#374151',
            background: '#111827',
            color: '#fff'
        }).then((result) => {
            laser.style.display = isRunning ? 'block' : 'none';
            if (result.isConfirmed) {
                window.location.href = decodedText;
            } else {
                closePreview();
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
            closePreview();
            resetUIState();
        });
    }
}

async function toggleCamera() {
    if (isTransitioning) return;
    isTransitioning = true;

    try {
        if (isRunning) {
            await html5QrCode.stop();
            btnText.innerText = "เปิดสแกน QR";
            btnToggle.classList.replace('btn-scan-stop', 'btn-scan-start');
            laser.style.display = 'none';
            isRunning = false;
            resetUIState();
        } else {
            const config = {
                fps: 20,
                aspectRatio: 1.0
            };

            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess
            );

            btnText.innerText = "ปิดสแกน QR";
            btnToggle.classList.replace('btn-scan-start', 'btn-scan-stop');
            laser.style.display = 'block';
            isRunning = true;
            statusLog.innerText = "กำลังสแกน...";
            statusDot.className = 'status-dot-active me-1';
            closePreview();
        }
    } catch (err) {
        console.error(err);
        statusLog.innerText = "กล้องมีปัญหา";
        isTransitioning = false;
    } finally {
        isTransitioning = false;
    }
}

fileInput.addEventListener('change', async e => {
    if (e.target.files.length === 0) return;

    const file = e.target.files[0];

    // แสดงพรีวิว
    const reader = new FileReader();
    reader.onload = (event) => {
        previewImage.src = event.target.result;
        previewContainer.classList.remove('d-none');
    };
    reader.readAsDataURL(file);

    if (isRunning) {
        try { await html5QrCode.stop(); isRunning = false; } catch (e) { }
    }

    Swal.fire({
        title: 'กำลังใช้ AI วิเคราะห์ภาพ',
        text: 'ระบบกำลังพยายามกู้คืนรายละเอียดภาพที่เบลอ...',
        allowOutsideClick: false,
        background: '#111827',
        color: '#fff',
        didOpen: () => { Swal.showLoading(); }
    });

    // เริ่มกระบวนการสแกนแบบ 3 ขั้นตอน (Triple Scan Strategy)
    try {
        // ขั้นตอนที่ 1: สแกนแบบ Raw (ภาพต้นฉบับ)
        const result1 = await html5QrCode.scanFile(file, false);
        handleSuccess(result1);
    } catch (err) {
        // ขั้นตอนที่ 2: ถ้าไม่ติด ลองสแกนแบบ Grayscale + High Contrast (แก้ภาพเบลอ/จาง)
        console.log("Stage 1 failed, trying Stage 2...");
        try {
            const processedBlob2 = await processImage(file, { contrast: 1.8, grayscale: true });
            const result2 = await html5QrCode.scanFile(new File([processedBlob2], "p2.png"), false);
            handleSuccess(result2);
        } catch (err2) {
            // ขั้นตอนที่ 3: ถ้ายังไม่ติด ลองสแกนแบบ Invert สี (แก้ QR สีขาวบนพื้นดำ)
            console.log("Stage 2 failed, trying Stage 3...");
            try {
                const processedBlob3 = await processImage(file, { contrast: 2.5, invert: true });
                const result3 = await html5QrCode.scanFile(new File([processedBlob3], "p3.png"), false);
                handleSuccess(result3);
            } catch (err3) {
                // หมดปัญญาแล้วจริงๆ
                showError();
            }
        }
    }
});

function processImage(file, options) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const MAX_SIZE = 1200;
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }

            canvas.width = width;
            canvas.height = height;

            let filters = [];
            if (options.contrast) filters.push(`contrast(${options.contrast})`);
            if (options.grayscale) filters.push(`grayscale(100%)`);
            if (options.invert) filters.push(`invert(100%)`);

            ctx.filter = filters.join(' ');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(blob => resolve(blob), 'image/png');
        };
    });
}

function handleSuccess(result) {
    Swal.close();
    onScanSuccess(result);
}

function showError() {
    Swal.close();
    statusLog.innerText = "ไม่พบข้อมูล";
    Swal.fire({
        title: 'หาไม่เจอจริงๆ ครับ',
        html: `รูปนี้สแกนยากมาก! แนะนำให้:<br>1. <b>เปิดไฟ</b> หรือเพิ่มแสงในรูป<br>2. <b> Screenshot</b> เฉพาะตัว QR ให้ชัดที่สุด`,
        icon: 'error',
        background: '#111827',
        color: '#fff'
    });
    resetUIState();
}

btnClosePreview.addEventListener('click', () => {
    closePreview();
    try { html5QrCode.clear(); } catch (err) { }
    resetUIState();
});