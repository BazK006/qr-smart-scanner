const html5QrCode = new Html5Qrcode("reader");
let isRunning = false;
let isTransitioning = false;

const btnToggle = document.getElementById('btn-toggle');
const btnText = document.getElementById('btn-text');
const laser = document.getElementById('laser');
const info = document.getElementById('info');
const statusLog = document.getElementById('status-log');
const statusDot = document.getElementById('status-dot');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const btnClosePreview = document.getElementById('btn-close-preview');

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

function showAiOverlay(show) {
    const overlay = document.getElementById('ai-overlay');
    if (!overlay) return;
    if (show) {
        overlay.classList.remove('d-none');
        overlay.classList.add('d-flex');
    } else {
        overlay.classList.add('d-none');
        overlay.classList.remove('d-flex');
    }
}

function onScanSuccess(decodedText) {
    if (navigator.vibrate) navigator.vibrate(150);
    statusLog.innerText = "พบข้อมูล";
    laser.style.display = 'none';

    if (decodedText.startsWith('http')) {
        info.innerHTML = `<span class="text-success fw-bold">✅ สแกนสำเร็จ!</span>`;
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

function handleSuccess(result) {
    Swal.close();
    onScanSuccess(result);
}

function showError() {
    Swal.close();
    statusLog.innerText = "ไม่พบข้อมูล";
    Swal.fire({
        title: 'ไม่สามารถสแกนได้',
        html: `รูปนี้สแกนยากมาก! แนะนำให้:<br>1. <b>เพิ่มแสง</b> หรือถ่ายในที่สว่าง<br>2. <b>Screenshot</b> เฉพาะตัว QR ให้ชัดที่สุด`,
        icon: 'error',
        background: '#111827',
        color: '#fff'
    });
    resetUIState();
}

async function scanWithClaudeVision(fileOrBlob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const base64Data = e.target.result.split(',')[1];
                const mediaType = fileOrBlob.type || 'image/jpeg';

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
                                    text: `This image contains a QR code. Please decode the QR code and return ONLY the exact text/URL/data encoded in it. No explanation, no prefix — just the raw content. If unreadable, reply exactly: CANNOT_DECODE`
                                }
                            ]
                        }]
                    })
                });

                const data = await response.json();
                const text = data?.content?.[0]?.text?.trim();
                resolve((text && text !== 'CANNOT_DECODE') ? text : null);
            } catch (err) {
                resolve(null);
            }
        };
        reader.readAsDataURL(fileOrBlob);
    });
}

let frameProcessorInterval = null;
let lastAiAttempt = 0;
const AI_COOLDOWN = 5000;
const AI_TRIGGER_MS = 8000;

function startFrameProcessor() {
    stopFrameProcessor();
    const startTime = Date.now();

    frameProcessorInterval = setInterval(async () => {
        if (!isRunning) return;

        const now = Date.now();
        if (now - startTime < AI_TRIGGER_MS) return;
        if (now - lastAiAttempt < AI_COOLDOWN) return;

        const video = document.querySelector('#reader video');
        if (!video || video.readyState < 2) return;

        lastAiAttempt = now;
        console.log("AI Vision fallback: capturing frame...");
        showAiOverlay(true);

        try {
            const blob = await captureFrameAsBlob(video);
            const result = await scanWithClaudeVision(blob);
            if (result && isRunning) {
                stopFrameProcessor();
                showAiOverlay(false);
                await html5QrCode.stop();
                isRunning = false;
                btnText.innerText = "เปิดสแกน QR";
                btnToggle.classList.replace('btn-scan-stop', 'btn-scan-start');
                laser.style.display = 'none';
                handleSuccess(result);
            } else {
                showAiOverlay(false);
            }
        } catch (err) {
            console.warn("AI frame scan error:", err);
            showAiOverlay(false);
        }
    }, 500);
}

function stopFrameProcessor() {
    if (frameProcessorInterval) {
        clearInterval(frameProcessorInterval);
        frameProcessorInterval = null;
    }
    showAiOverlay(false);
}

function captureFrameAsBlob(video) {
    return new Promise((resolve, reject) => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                blob => blob ? resolve(blob) : reject(new Error("Blob failed")),
                'image/jpeg', 0.95
            );
        } catch (e) { reject(e); }
    });
}

async function toggleCamera() {
    if (isTransitioning) return;
    isTransitioning = true;

    try {
        if (isRunning) {
            stopFrameProcessor();
            await html5QrCode.stop();
            btnText.innerText = "เปิดสแกน QR";
            btnToggle.classList.replace('btn-scan-stop', 'btn-scan-start');
            laser.style.display = 'none';
            isRunning = false;
            resetUIState();

        } else {
            const screenMin = Math.min(window.innerWidth, window.innerHeight);
            const boxSize = Math.floor(screenMin * 0.72);

            const config = {
                fps: 30,
                aspectRatio: 1.0,
                qrbox: { width: boxSize, height: boxSize },
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.DATA_MATRIX,
                    Html5QrcodeSupportedFormats.AZTEC,
                    Html5QrcodeSupportedFormats.PDF_417,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                ],
                experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                showTorchButtonIfSupported: false,
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
            startFrameProcessor();
        }

    } catch (err) {
        console.error("toggleCamera error:", err);

        if (!isRunning) {
            try {
                const devices = await Html5Qrcode.getCameras();
                const backCamera = devices.find(d => /back|rear|environment/i.test(d.label))
                    || devices[devices.length - 1];

                if (!backCamera) throw new Error("No camera found");

                const screenMin = Math.min(window.innerWidth, window.innerHeight);
                const boxSize = Math.floor(screenMin * 0.72);

                await html5QrCode.start(
                    backCamera.id,
                    {
                        fps: 25,
                        aspectRatio: 1.0,
                        qrbox: { width: boxSize, height: boxSize },
                        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                        showTorchButtonIfSupported: false,
                    },
                    onScanSuccess
                );

                btnText.innerText = "ปิดสแกน QR";
                btnToggle.classList.replace('btn-scan-start', 'btn-scan-stop');
                laser.style.display = 'block';
                isRunning = true;
                statusLog.innerText = "กำลังสแกน...";
                statusDot.className = 'status-dot-active me-1';
                closePreview();
                startFrameProcessor();

            } catch (fallbackErr) {
                console.error("Camera fallback failed:", fallbackErr);
                statusLog.innerText = "ไม่สามารถเปิดกล้องได้";
                Swal.fire({
                    title: 'เปิดกล้องไม่ได้',
                    text: 'กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่าเบราว์เซอร์',
                    icon: 'error',
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
    reader.onload = ev => {
        previewImage.src = ev.target.result;
        previewContainer.classList.remove('d-none');
    };
    reader.readAsDataURL(file);

    if (isRunning) {
        try {
            stopFrameProcessor();
            await html5QrCode.stop();
            isRunning = false;
            btnText.innerText = "เปิดสแกน QR";
            btnToggle.classList.replace('btn-scan-stop', 'btn-scan-start');
            laser.style.display = 'none';
        } catch (_) { }
    }

    Swal.fire({
        title: 'กำลังวิเคราะห์ภาพ',
        text: 'ระบบกำลังพยายามอ่าน QR Code...',
        allowOutsideClick: false,
        background: '#111827',
        color: '#fff',
        didOpen: () => Swal.showLoading()
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
        console.log(`Stage ${i + 1}: ${label}`);
        try {
            let fileToScan = file;
            if (options !== null || scale !== 1) {
                const blob = await processImage(file, options || {}, scale);
                fileToScan = new File([blob], `stage${i + 1}.png`);
            }
            const result = await html5QrCode.scanFile(fileToScan, false);
            handleSuccess(result);
            return;
        } catch (_) {
            console.log(`Stage ${i + 1} failed`);
        }
    }

    console.log("All stages failed → Claude Vision AI");
    try {
        const result = await scanWithClaudeVision(file);
        if (result) { handleSuccess(result); return; }
    } catch (_) { }

    showError();
});

function processImage(file, options = {}, scale = 1) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const MAX_SIZE = 1200;
            let w = img.width * scale;
            let h = img.height * scale;
            if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
            else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
            w = Math.round(w); h = Math.round(h);

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = w; canvas.height = h;

            const filters = [];
            if (options.contrast) filters.push(`contrast(${options.contrast})`);
            if (options.grayscale) filters.push(`grayscale(100%)`);
            if (options.invert) filters.push(`invert(100%)`);
            ctx.filter = filters.length ? filters.join(' ') : 'none';
            ctx.drawImage(img, 0, 0, w, h);
            ctx.filter = 'none';

            if (options.sharpen || options.sharpenStrong) {
                ctx.putImageData(
                    applySharpen(ctx.getImageData(0, 0, w, h), options.sharpenStrong ? 'strong' : 'normal'),
                    0, 0
                );
            }

            if (options.adaptiveThreshold) {
                ctx.putImageData(applyAdaptiveThreshold(ctx.getImageData(0, 0, w, h), 15, 10), 0, 0);
                if (options.invert) {
                    const inv = ctx.getImageData(0, 0, w, h);
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
                for (let ky = -1; ky <= 1; ky++)
                    for (let kx = -1; kx <= 1; kx++)
                        val += data[((y + ky) * width + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
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
    for (let i = 0; i < gray.length; i++)
        gray[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);

    const half = Math.floor(blockSize / 2);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0, count = 0;
            for (let ky = -half; ky <= half; ky++)
                for (let kx = -half; kx <= half; kx++) {
                    const ny = y + ky, nx = x + kx;
                    if (ny >= 0 && ny < height && nx >= 0 && nx < width) { sum += gray[ny * width + nx]; count++; }
                }
            const pixel = gray[y * width + x] < (sum / count) - C ? 0 : 255;
            const idx = (y * width + x) * 4;
            output[idx] = output[idx + 1] = output[idx + 2] = pixel;
            output[idx + 3] = 255;
        }
    }
    return new ImageData(output, width, height);
}

btnClosePreview.addEventListener('click', () => {
    closePreview();
    try { html5QrCode.clear(); } catch (_) { }
    resetUIState();
});