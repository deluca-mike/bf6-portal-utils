// ============================================================================
// BF6 PORTAL UIQRCode STUDIO - CLIENT APPLICATION CONTROLLER
// ============================================================================

(function () {
    'use strict';

    // DOM Elements
    const qrText = document.getElementById('qrText');
    const eccSelect = document.getElementById('eccSelect');
    const scaleRange = document.getElementById('scaleRange');
    const scaleVal = document.getElementById('scaleVal');
    const marginRange = document.getElementById('marginRange');
    const marginVal = document.getElementById('marginVal');
    const darkColorInput = document.getElementById('darkColor');
    const lightColorInput = document.getElementById('lightColor');
    const lightAlphaInput = document.getElementById('lightAlpha');
    const inspectCheckbox = document.getElementById('inspectCheckbox');
    const stepByStepCheckbox = document.getElementById('stepByStepCheckbox');
    const playbackBar = document.getElementById('playbackBar');
    const playbackSlider = document.getElementById('playbackSlider');
    const currentStepPill = document.getElementById('currentStepPill');
    const qrCanvas = document.getElementById('qrCanvas');
    const ctx = qrCanvas.getContext('2d');

    const metricVersion = document.getElementById('metricVersion');
    const metricPixels = document.getElementById('metricPixels');
    const metricDrawCalls = document.getElementById('metricDrawCalls');
    const metricNaiveDiff = document.getElementById('metricNaiveDiff');
    const metricSavings = document.getElementById('metricSavings');
    const metricPayloadBytes = document.getElementById('metricPayloadBytes');
    const metricPayloadChars = document.getElementById('metricPayloadChars');

    const decodeStatusBox = document.getElementById('decodeStatusBox');
    const decodeStatusText = document.getElementById('decodeStatusText');
    const decodePayloadCode = document.getElementById('decodePayloadCode');

    const codeSnippet = document.getElementById('codeSnippet');
    const copyCodeBtn = document.getElementById('copyCodeBtn');
    const toast = document.getElementById('toast');

    // Current State
    let currentResult = null;
    let isOversized = false;

    // Palette of debug colors for merged rectangle visualization
    const DEBUG_COLORS = [
        'rgba(0, 210, 255, 0.4)',
        'rgba(188, 140, 255, 0.4)',
        'rgba(63, 185, 80, 0.4)',
        'rgba(240, 136, 62, 0.4)',
        'rgba(255, 105, 180, 0.4)',
        'rgba(255, 215, 0, 0.4)',
        'rgba(0, 255, 255, 0.4)',
    ];

    function hexToRgb(hex) {
        const c = parseInt(hex.slice(1), 16);
        return {
            r: (c >> 16) & 255,
            g: (c >> 8) & 255,
            b: c & 255,
        };
    }

    function hexToNormalized(hex) {
        const rgb = hexToRgb(hex);
        return {
            r: Number((rgb.r / 255).toFixed(3)),
            g: Number((rgb.g / 255).toFixed(3)),
            b: Number((rgb.b / 255).toFixed(3)),
        };
    }

    function updateQRCode() {
        const text = qrText.value;
        const ecc = eccSelect.value;
        const scale = parseFloat(scaleRange.value);
        const margin = parseInt(marginRange.value, 10);
        const darkColor = darkColorInput.value;
        const lightColor = lightColorInput.value;
        const lightAlpha = parseFloat(lightAlphaInput.value);

        scaleVal.textContent = `${scale.toFixed(1)}x (${Math.round(10 * scale)}px/mod)`;
        marginVal.textContent = `${margin} modules`;

        if (!text) {
            ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
            metricVersion.textContent = '--';
            metricPixels.textContent = '--';
            metricDrawCalls.textContent = '--';
            metricNaiveDiff.textContent = 'vs -- naive calls';
            metricSavings.textContent = '--%';
            metricPayloadBytes.textContent = '--';
            metricPayloadChars.textContent = '0 characters';
            decodeStatusBox.className = 'decode-status-box error';
            decodeStatusText.textContent = 'Empty payload';
            decodePayloadCode.textContent = '--';
            updateCodeSnippet('', ecc, scale, margin, darkColor, lightColor, lightAlpha);
            return;
        }

        const payloadBytes = new TextEncoder().encode(text).length;
        metricPayloadBytes.textContent = `${payloadBytes.toLocaleString()} B`;
        metricPayloadChars.textContent = `${text.length.toLocaleString()} characters`;

        // Call the single-source-of-truth compiled encoder
        const encoder = window.UIQRCodeEncoder || window.UIQRCode?.Encoder;
        if (!encoder) {
            console.error('UIQRCodeEncoder not loaded');
            return;
        }

        const result = encoder.encodeToRectangles(text, ecc);

        if (!result) {
            isOversized = true;
            currentResult = null;
            ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
            metricVersion.textContent = 'EXCEEDED';
            metricPixels.textContent = `Max Version: ${encoder.MAX_QR_VERSION || 18}`;
            metricDrawCalls.textContent = 'ERROR';
            metricNaiveDiff.textContent = 'Payload too large for MAX_QR_VERSION';
            metricSavings.textContent = '0%';
            decodeStatusBox.className = 'decode-status-box error';
            decodeStatusText.textContent = `Payload exceeds MAX_QR_VERSION (${encoder.MAX_QR_VERSION || 18}) limit`;
            decodePayloadCode.textContent = 'Initialization Rejected';
            updateCodeSnippet(text, ecc, scale, margin, darkColor, lightColor, lightAlpha);
            return;
        }

        isOversized = false;
        currentResult = result;

        const N = result.size;
        const totalUnits = N + 2 * margin;
        const basePixelSize = totalUnits * 10 * scale;
        const cellSize = 10 * scale;

        qrCanvas.width = Math.round(basePixelSize);
        qrCanvas.height = Math.round(basePixelSize);

        // Update Slider bounds
        const totalRects = result.totalRectangles;
        playbackSlider.max = String(totalRects);
        if (parseInt(playbackSlider.value, 10) > totalRects || !stepByStepCheckbox.checked) {
            playbackSlider.value = String(totalRects);
        }
        currentStepPill.textContent = `${playbackSlider.value} / ${totalRects}`;

        // Metrics
        metricVersion.textContent = `V${result.version} (${N}×${N})`;
        metricPixels.textContent = `${Math.round(basePixelSize)} × ${Math.round(basePixelSize)} px`;
        metricDrawCalls.textContent = String(totalRects + 2); // +2 for Base Container and QR Container
        metricNaiveDiff.textContent = `vs ${result.naiveCount + 2} naive calls`;
        metricSavings.textContent = `${result.savings.toFixed(1)}%`;

        renderCanvas(margin, cellSize, darkColor, lightColor, lightAlpha);
        verifyScan();
        updateCodeSnippet(text, ecc, scale, margin, darkColor, lightColor, lightAlpha);
    }

    function renderCanvas(margin, cellSize, darkColor, lightColor, lightAlpha) {
        if (!currentResult) return;

        const canvasW = qrCanvas.width;
        const canvasH = qrCanvas.height;

        ctx.clearRect(0, 0, canvasW, canvasH);

        // 1. Draw Light Background Canvas
        ctx.save();
        ctx.globalAlpha = lightAlpha;
        ctx.fillStyle = lightColor;
        ctx.fillRect(0, 0, canvasW, canvasH);
        ctx.restore();

        const stepLimit = stepByStepCheckbox.checked
            ? parseInt(playbackSlider.value, 10)
            : currentResult.totalRectangles;

        const rects = currentResult.rectangles;
        const showInspect = inspectCheckbox.checked;

        // 2. Draw Rectangles
        for (let i = 0; i < stepLimit && i < rects.length; ++i) {
            const r = rects[i];
            const x0 = Math.round((r.col + margin) * cellSize);
            const y0 = Math.round((r.row + margin) * cellSize);
            const x1 = Math.round((r.col + r.w + margin) * cellSize);
            const y1 = Math.round((r.row + r.h + margin) * cellSize);
            const w = Math.max(1, x1 - x0);
            const h = Math.max(1, y1 - y0);

            ctx.fillStyle = darkColor;
            ctx.fillRect(x0, y0, w, h);

            if (showInspect) {
                ctx.save();
                const debugColor = DEBUG_COLORS[i % DEBUG_COLORS.length];
                ctx.fillStyle = debugColor;
                ctx.fillRect(x0, y0, w, h);
                ctx.strokeStyle = '#00d2ff';
                ctx.lineWidth = 1;
                ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
                ctx.restore();
            }
        }
    }

    function verifyScan() {
        if (!window.jsQR || isOversized || !currentResult) {
            return;
        }

        try {
            const imageData = ctx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            if (code && code.data === qrText.value) {
                decodeStatusBox.className = 'decode-status-box';
                decodeStatusText.textContent = `Scannable Matrix Confirmed (${code.data.length} chars)`;
                decodePayloadCode.textContent = code.data;
            } else if (code) {
                decodeStatusBox.className = 'decode-status-box';
                decodeStatusText.textContent = 'Decoded (partial/mismatch)';
                decodePayloadCode.textContent = code.data;
            } else {
                decodeStatusBox.className = 'decode-status-box error';
                decodeStatusText.textContent = 'Not yet fully scannable (step-by-step active or margin < 4)';
                decodePayloadCode.textContent = 'Incomplete Render';
            }
        } catch (e) {
            decodeStatusBox.className = 'decode-status-box error';
            decodeStatusText.textContent = 'Decoder error';
            decodePayloadCode.textContent = String(e);
        }
    }

    function updateCodeSnippet(text, ecc, scale, margin, darkHex, lightHex, lightAlpha) {
        const darkVec = hexToNormalized(darkHex);
        const lightVec = hexToNormalized(lightHex);

        const lines = [
            `import { UI, UIQRCode } from 'bf6-portal-utils';`,
            ``,
            `// Instantiate zero-allocation, throttled QR code element`,
            `const qr = new UIQRCode({`,
            `    data: ${JSON.stringify(text)},`,
            `    ecc: UIQRCode.ECC.${ecc === 'L' ? 'Low' : ecc === 'M' ? 'Medium' : ecc === 'Q' ? 'Quartile' : 'High'},`,
        ];

        if (scale !== 1) {
            lines.push(`    scale: ${scale},`);
        }
        if (margin !== 4) {
            lines.push(`    margin: ${margin},`);
        }
        if (darkHex !== '#000000') {
            lines.push(`    color: { r: ${darkVec.r}, g: ${darkVec.g}, b: ${darkVec.b} },`);
        }
        if (lightHex !== '#ffffff') {
            lines.push(`    bgColor: { r: ${lightVec.r}, g: ${lightVec.g}, b: ${lightVec.b} },`);
        }
        if (lightAlpha !== 1) {
            lines.push(`    bgAlpha: ${lightAlpha},`);
        }

        lines.push(`});`);
        codeSnippet.textContent = lines.join('\n');
    }

    function showToast(msg = 'Copied to clipboard!') {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
    }

    // Event Listeners
    qrText.addEventListener('input', updateQRCode);
    eccSelect.addEventListener('change', updateQRCode);
    scaleRange.addEventListener('input', updateQRCode);
    marginRange.addEventListener('input', updateQRCode);
    darkColorInput.addEventListener('input', updateQRCode);
    lightColorInput.addEventListener('input', updateQRCode);
    lightAlphaInput.addEventListener('input', updateQRCode);
    inspectCheckbox.addEventListener('change', () => {
        const margin = parseInt(marginRange.value, 10);
        const cellSize = 10 * parseFloat(scaleRange.value);
        renderCanvas(margin, cellSize, darkColorInput.value, lightColorInput.value, parseFloat(lightAlphaInput.value));
    });

    stepByStepCheckbox.addEventListener('change', () => {
        if (stepByStepCheckbox.checked) {
            playbackBar.classList.remove('hidden');
        } else {
            playbackBar.classList.add('hidden');
        }
        updateQRCode();
    });

    playbackSlider.addEventListener('input', () => {
        currentStepPill.textContent = `${playbackSlider.value} / ${playbackSlider.max}`;
        const margin = parseInt(marginRange.value, 10);
        const cellSize = 10 * parseFloat(scaleRange.value);
        renderCanvas(margin, cellSize, darkColorInput.value, lightColorInput.value, parseFloat(lightAlphaInput.value));
        verifyScan();
    });

    // Presets
    document.querySelectorAll('.preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (btn.dataset.preset) {
                qrText.value = btn.dataset.preset;
            } else if (btn.dataset.presetRepeat) {
                const [char, count] = btn.dataset.presetRepeat.split(':');
                qrText.value = char.repeat(parseInt(count, 10));
            }
            updateQRCode();
        });
    });

    // Copy Code
    copyCodeBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(codeSnippet.textContent).then(() => {
            showToast();
        });
    });

    // Initial render
    updateQRCode();
})();
