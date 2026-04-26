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

    const strategies = [
        { label: "Raw", options: null, scale: 1 },
        { label: "Grayscale+Contrast", options: { contrast: 1.8, grayscale: true }, scale: 1 },
        { label: "Sharpen", options: { sharpen: true, contrast: 1.5 }, scale: 1 },
        { label: "Invert", options: { contrast: 2.5, invert: true }, scale: 1 },
        { label: "Sharpen+Grayscale+HiContrast", options: { sharpen: true, grayscale: true, contrast: 2.5 }, scale: 1 },
        { label: "AdaptiveThreshold", options: { adaptiveThreshold: true }, scale: 1 },
        { label: "AdaptiveThreshold+Invert", options: { adaptiveThreshold: true, invert: true }, scale: 1 },
        { label: "Scale1.5x+Sharpen", options: { sharpen: true, contrast: 1.8, grayscale: true }, scale: 1.5 },
        { label: "Scale2x+Sharpen", options: { sharpen: true, contrast: 2.0, grayscale: true }, scale: 2.0 },
        { label: "HeavySharpen+Adaptive", options: { sharpenStrong: true, adaptiveThreshold: true }, scale: 1 },
    ];

    for (let i = 0; i < strategies.length; i++) {
        const { label, options, scale } = strategies[i];
        console.log(`Trying Stage ${i + 1}: ${label}`);
        try {
            let fileToScan = file;
            if (options !== null || scale !== 1) {
                const blob = await processImage(file, options || {}, scale);
                fileToScan = new File([blob], `stage${i + 1}.png`);
            }
            const result = await html5QrCode.scanFile(fileToScan, false);
            handleSuccess(result);
            return;
        } catch (err) {
            console.log(`Stage ${i + 1} (${label}) failed`);
        }
    }

    console.log("All stages failed, trying Claude Vision AI...");
    try {
        const result = await scanWithClaudeVision(file);
        if (result) {
            handleSuccess(result);
            return;
        }
    } catch (aiErr) {
        console.log("Claude Vision also failed:", aiErr);
    }

    showError();
});

function processImage(file, options = {}, scale = 1) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const MAX_SIZE = 1200;
            let width = img.width * scale;
            let height = img.height * scale;

            if (width > height) {
                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }

            width = Math.round(width);
            height = Math.round(height);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;

            let filters = [];
            if (options.contrast) filters.push(`contrast(${options.contrast})`);
            if (options.grayscale) filters.push(`grayscale(100%)`);
            if (options.invert) filters.push(`invert(100%)`);
            if (!options.adaptiveThreshold && !options.sharpen && !options.sharpenStrong && filters.length === 0) {
                filters.push('none');
            }

            ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';
            ctx.drawImage(img, 0, 0, width, height);
            ctx.filter = 'none';

            if (options.sharpen || options.sharpenStrong) {
                const imageData = ctx.getImageData(0, 0, width, height);
                const sharpened = applySharpen(imageData, options.sharpenStrong ? 'strong' : 'normal');
                ctx.putImageData(sharpened, 0, 0);
            }

            if (options.adaptiveThreshold) {
                const imageData = ctx.getImageData(0, 0, width, height);
                const thresholded = applyAdaptiveThreshold(imageData, 15, 10);
                ctx.putImageData(thresholded, 0, 0);

                if (options.invert) {
                    const inv = ctx.getImageData(0, 0, width, height);
                    for (let i = 0; i < inv.data.length; i += 4) {
                        inv.data[i] = 255 - inv.data[i];
                        inv.data[i + 1] = 255 - inv.data[i + 1];
                        inv.data[i + 2] = 255 - inv.data[i + 2];
                    }
                    ctx.putImageData(inv, 0, 0);
                }
            }

            canvas.toBlob(blob => resolve(blob), 'image/png');
        };
    });
}

function applySharpen(imageData, mode = 'normal') {
    const { data, width, height } = imageData;
    const output = new Uint8ClampedArray(data);

    const kernel = mode === 'strong'
        ? [0, -1, 0, -1, 5, -1, 0, -1, 0]
        : [0, -0.5, 0, -0.5, 3, -0.5, 0, -0.5, 0];

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;

            for (let c = 0; c < 3; c++) {
                let val = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const ki = (ky + 1) * 3 + (kx + 1);
                        const pi = ((y + ky) * width + (x + kx)) * 4;
                        val += data[pi + c] * kernel[ki];
                    }
                }
                output[idx + c] = Math.min(255, Math.max(0, val));
            }
            output[idx + 3] = data[idx + 3];
        }
    }

    return new ImageData(output, width, height);
}

function applyAdaptiveThreshold(imageData, blockSize = 15, C = 10) {
    const { data, width, height } = imageData;
    const output = new Uint8ClampedArray(data.length);

    const gray = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }

    const half = Math.floor(blockSize / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0, count = 0;
            for (let ky = -half; ky <= half; ky++) {
                for (let kx = -half; kx <= half; kx++) {
                    const ny = y + ky, nx = x + kx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                        sum += gray[ny * width + nx];
                        count++;
                    }
                }
            }
            const mean = sum / count;
            const pixel = gray[y * width + x] < mean - C ? 0 : 255;
            const idx = (y * width + x) * 4;
            output[idx] = output[idx + 1] = output[idx + 2] = pixel;
            output[idx + 3] = 255;
        }
    }

    return new ImageData(output, width, height);
}

async function scanWithClaudeVision(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64Data = e.target.result.split(',')[1];
                const mediaType = file.type || 'image/jpeg';

                const response = await fetch("https://api.anthropic.com/v1/messages", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 1000,
                        messages: [{
                            role: "user",
                            content: [
                                {
                                    type: "image",
                                    source: { type: "base64", media_type: mediaType, data: base64Data }
                                },
                                {
                                    type: "text",
                                    text: `This image contains a QR code. Please decode the QR code and return ONLY the exact text/URL/data encoded in the QR code. Do not add any explanation, prefix, or extra text — just the raw decoded content. If you cannot read the QR code, reply with exactly: CANNOT_DECODE`
                                }
                            ]
                        }]
                    })
                });

                const data = await response.json();
                const text = data?.content?.[0]?.text?.trim();

                if (text && text !== 'CANNOT_DECODE') {
                    resolve(text);
                } else {
                    resolve(null);
                }
            } catch (err) {
                resolve(null);
            }
        };
        reader.readAsDataURL(file);
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
        title: 'ไม่สามารถสแกนได้',
        html: `ไม่พบข้อมูลในรหัส QR ที่คุณสแกน! <br><br>แนะนำให้:<br>1. <b>เปิดไฟ</b> หรือเพิ่มแสงในรูป<br>2. <b>Screenshot</b> เฉพาะตัว QR ให้ชัดที่สุด`,
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