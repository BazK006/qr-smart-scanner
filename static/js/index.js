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
    info.innerHTML = `<span class="text-secondary opacity-75">วาง QR Code ให้อยู่ในกรอบสแกน</span>`;
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
            const cameraConfig = { facingMode: { exact: "environment" } };

            const scanConfig = {
                fps: 10,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const minEdgePercentage = 0.70;
                    const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                    const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                    return { width: qrboxSize, height: qrboxSize };
                },
                videoConstraints: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    advanced: [{ focusMode: "continuous" }]
                }
            };

            await html5QrCode.start(cameraConfig, scanConfig, onScanSuccess);

            btnText.innerText = "ปิดสแกน QR";
            btnToggle.classList.replace('btn-scan-start', 'btn-scan-stop');
            laser.style.display = 'block';
            isRunning = true;
            statusLog.innerText = "กำลังสแกน...";
            statusDot.className = 'status-dot-active me-1';
            closePreview();
        }
    } catch (err) {
        console.error("Camera error:", err);
        if (!isRunning) {
            try {
                await html5QrCode.start({ facingMode: "environment" }, { fps: 10 }, onScanSuccess);
                isRunning = true;
            } catch (e) {
                statusLog.innerText = "ไม่สามารถเปิดกล้องหลังได้";
                statusDot.className = 'status-dot-standby me-1';
                Swal.fire({
                    title: 'เปิดกล้องไม่สำเร็จ',
                    text: 'กรุณาตรวจสอบการอนุญาตเข้าถึงกล้องหลัง',
                    icon: 'error',
                    confirmButtonColor: '#ef4444',
                    background: '#111827',
                    color: '#fff'
                });
            }
        }
    } finally {
        isTransitioning = false;
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

    if (isRunning) {
        try {
            await html5QrCode.stop();
            isRunning = false;
            laser.style.display = 'none';
            btnText.innerText = "เปิดสแกน QR";
            btnToggle.classList.replace('btn-scan-stop', 'btn-scan-start');
        } catch (e) { console.log(e); }
    }

    statusLog.innerText = "กำลังวิเคราะห์ภาพ...";
    statusDot.className = 'status-dot-active me-1';

    Swal.fire({
        title: 'กำลังอ่านไฟล์...',
        text: 'กรุณารอสักครู่ ระบบกำลังประมวลผล...',
        allowOutsideClick: false,
        background: '#111827',
        color: '#fff',
        didOpen: () => { Swal.showLoading(); }
    });

    setTimeout(() => {
        html5QrCode.scanFile(file, false)
            .then(result => {
                Swal.close();
                onScanSuccess(result);
            })
            .catch(err => {
                Swal.close();
                statusLog.innerText = "ไม่พบ QR Code";
                statusDot.className = 'status-dot-standby me-1';
                Swal.fire({
                    title: 'สแกนไม่สำเร็จ',
                    html: `ไม่พบ QR Code ในรูปภาพ<br><br>แนะนำให้ <b>Screenshot</b> เฉพาะส่วน QR Code แล้วลองอัปโหลดใหม่อีกครั้งนะครับ`,
                    icon: 'warning',
                    confirmButtonColor: '#0ea5e9',
                    background: '#111827',
                    color: '#fff'
                }).then(() => {
                    resetUIState();
                    closePreview();
                });
            });
    }, 500);
});

btnClosePreview.addEventListener('click', () => {
    closePreview();
    try { html5QrCode.clear(); } catch (err) { }
    if (!isRunning) {
        const readerDiv = document.getElementById('reader');
        readerDiv.querySelectorAll('img, canvas').forEach(node => node.remove());
    }
    resetUIState();
});