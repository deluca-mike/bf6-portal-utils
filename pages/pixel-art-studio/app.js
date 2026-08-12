/****** State Management ******/
let rawLoadedImage = null;
let currentEncodedModel = null;
let isPlaying = false;
let playInterval = null;
let isZoomedToOriginal = true;
let selectedFormat = 'base64';
let selectedAlgo = 'median-cut'; // 'median-cut' | 'most-frequent' | 'user-defined'
let customPalette = []; // Array of { r, g, b, a }
let selectedCustomSwatchIndex = -1;
let isEyedropperActive = true;

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const scaleSlider = document.getElementById('scale-slider');
const colorsSlider = document.getElementById('colors-slider');
const maxColorsGroup = document.getElementById('max-colors-group');
const maxColorsTitle = document.getElementById('max-colors-title');
const algoControlGroup = document.getElementById('algo-control-group');
const monochromeToggle = document.getElementById('monochrome-toggle');
const opacityToggle = document.getElementById('opacity-toggle');
const alphaThresholdSlider = document.getElementById('alpha-threshold-slider');
const alphaThresholdLabel = document.getElementById('alpha-threshold-label');
const payloadInput = document.getElementById('payload-input');
const formatB122Btn = document.getElementById('format-b122-btn');
const formatB64Btn = document.getElementById('format-b64-btn');
const copyPayloadBtn = document.getElementById('copy-payload-btn');
const gridSizeLabel = document.getElementById('grid-size-label');
const maxColorsLabel = document.getElementById('max-colors-label');
const paletteContainer = document.getElementById('palette-container');
const paletteCountLabel = document.getElementById('palette-count-label');
const userPaletteToolbar = document.getElementById('user-palette-toolbar');
const eyedropperBtn = document.getElementById('eyedropper-btn');
const addColorBtn = document.getElementById('add-color-btn');
const sortPaletteBtn = document.getElementById('sort-palette-btn');
const hiddenColorPicker = document.getElementById('hidden-color-picker');
const swatchTooltip = document.getElementById('swatch-tooltip');
const stepSlider = document.getElementById('step-slider');
const stepLabel = document.getElementById('step-label');
const playBtn = document.getElementById('play-btn');
const zoomToggleBtn = document.getElementById('zoom-toggle-btn');
const originalDimBadge = document.getElementById('original-dim-badge');

const canvasOriginal = document.getElementById('canvas-original');
const ctxOriginal = canvasOriginal.getContext('2d');
const canvasReconstructed = document.getElementById('canvas-reconstructed');
const ctxReconstructed = canvasReconstructed.getContext('2d');

/****** Event Listeners ******/
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

scaleSlider.addEventListener('input', () => {
    const val = parseInt(scaleSlider.value, 10);
    gridSizeLabel.textContent = `${val} x ${val}`;
    reencode();
});

colorsSlider.addEventListener('input', () => {
    const val = parseInt(colorsSlider.value, 10);
    maxColorsLabel.textContent = val;
    reencode();
});

const updateMaxColorsTitle = () => {
    maxColorsTitle.textContent = monochromeToggle.checked && opacityToggle.checked ? 'Max Alphas' : 'Max Colors';
};

monochromeToggle.addEventListener('change', () => {
    updateMaxColorsTitle();
    algoControlGroup.style.display = 'flex';
    if (selectedAlgo === 'user-defined') {
        maxColorsGroup.style.display = 'none';
        userPaletteToolbar.style.display = 'flex';
        canvasOriginal.classList.toggle('eyedropper-active', isEyedropperActive);
    } else {
        maxColorsGroup.style.display = 'flex';
        userPaletteToolbar.style.display = 'none';
        canvasOriginal.classList.remove('eyedropper-active');
    }
    reencode();
});

opacityToggle.addEventListener('change', () => {
    updateMaxColorsTitle();
    if (opacityToggle.checked) {
        alphaThresholdSlider.value = '1';
        alphaThresholdLabel.textContent = '1';
    } else {
        alphaThresholdSlider.value = '128';
        alphaThresholdLabel.textContent = '128';
    }
    reencode();
});

alphaThresholdSlider.addEventListener('input', () => {
    alphaThresholdLabel.textContent = alphaThresholdSlider.value;
    reencode();
});

// Algorithm Selector
document.querySelectorAll('#algo-btn-group .btn').forEach((btn) => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#algo-btn-group .btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedAlgo = btn.dataset.algo;

        if (selectedAlgo === 'user-defined') {
            maxColorsGroup.style.display = 'none';
            userPaletteToolbar.style.display = 'flex';
            canvasOriginal.classList.toggle('eyedropper-active', isEyedropperActive);

            // Inherit the active palette from the previous algorithm so it does not reset or change
            if (currentEncodedModel && currentEncodedModel.palette.length > 0) {
                customPalette = currentEncodedModel.palette.map((c) => ({ ...c }));
            } else if (customPalette.length === 0) {
                if (monochromeToggle.checked) {
                    customPalette = [
                        { r: 255, g: 255, b: 255, a: 64 },
                        { r: 255, g: 255, b: 255, a: 128 },
                        { r: 255, g: 255, b: 255, a: 255 },
                    ];
                } else {
                    customPalette = [
                        { r: 255, g: 0, b: 0, a: 255 },
                        { r: 0, g: 255, b: 0, a: 255 },
                        { r: 0, g: 0, b: 255, a: 255 },
                    ];
                }
            }
            if (selectedCustomSwatchIndex >= customPalette.length) {
                selectedCustomSwatchIndex = 0;
            }
        } else {
            maxColorsGroup.style.display = 'flex';
            userPaletteToolbar.style.display = 'none';
            canvasOriginal.classList.remove('eyedropper-active');
        }

        reencode();
    });
});

// User Defined Palette Toolbar Controls
eyedropperBtn.addEventListener('click', () => {
    isEyedropperActive = !isEyedropperActive;
    eyedropperBtn.classList.toggle('active', isEyedropperActive);
    eyedropperBtn.textContent = isEyedropperActive ? '🎯 Eyedropper: On' : '🎯 Eyedropper: Off';
    canvasOriginal.classList.toggle('eyedropper-active', isEyedropperActive);
});

function openColorPickerForSwatch(index, anchorEl) {
    if (index < 0 || index >= customPalette.length) return;
    selectedCustomSwatchIndex = index;
    const c = customPalette[index];
    const rHex = Math.max(0, Math.min(255, Math.round(c.r)))
        .toString(16)
        .padStart(2, '0');
    const gHex = Math.max(0, Math.min(255, Math.round(c.g)))
        .toString(16)
        .padStart(2, '0');
    const bHex = Math.max(0, Math.min(255, Math.round(c.b)))
        .toString(16)
        .padStart(2, '0');
    hiddenColorPicker.value = `#${rHex}${gHex}${bHex}`;

    if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        hiddenColorPicker.style.left = `${rect.left}px`;
        hiddenColorPicker.style.top = `${rect.bottom}px`;
    }

    try {
        if (typeof hiddenColorPicker.showPicker === 'function') {
            hiddenColorPicker.showPicker();
        } else {
            hiddenColorPicker.click();
        }
    } catch {
        hiddenColorPicker.click();
    }
}

addColorBtn.addEventListener('click', () => {
    if (monochromeToggle.checked) {
        const input = prompt('Enter alpha value for new swatch (1-255 or 0.0-1.0):', '128');
        if (input !== null && input.trim() !== '') {
            const parsed = PixelArtEncoder.parseColor(input);
            customPalette.push({ r: 255, g: 255, b: 255, a: parsed.a !== undefined ? parsed.a : 255 });
            selectedCustomSwatchIndex = customPalette.length - 1;
            reencode();
        }
        return;
    }

    const newColor = { r: 56, g: 189, b: 248, a: 255 };
    customPalette.push(newColor);
    selectedCustomSwatchIndex = customPalette.length - 1;
    reencode();

    setTimeout(() => {
        const swatches = paletteContainer.querySelectorAll('.palette-swatch');
        const targetSwatch = swatches[selectedCustomSwatchIndex] || addColorBtn;
        openColorPickerForSwatch(selectedCustomSwatchIndex, targetSwatch);
    }, 0);
});

function handleColorPickerInput(e) {
    const hex = e.target.value;
    const parsed = PixelArtEncoder.parseColor(hex);
    if (selectedCustomSwatchIndex >= 0 && selectedCustomSwatchIndex < customPalette.length) {
        const prevAlpha =
            customPalette[selectedCustomSwatchIndex].a !== undefined ? customPalette[selectedCustomSwatchIndex].a : 255;
        customPalette[selectedCustomSwatchIndex] = {
            r: parsed.r,
            g: parsed.g,
            b: parsed.b,
            a: opacityToggle.checked ? prevAlpha : 255,
        };
        reencode();
    }
}

hiddenColorPicker.addEventListener('input', handleColorPickerInput);
hiddenColorPicker.addEventListener('change', handleColorPickerInput);

sortPaletteBtn.addEventListener('click', () => {
    if (customPalette.length <= 1) return;
    if (monochromeToggle.checked) {
        customPalette.sort((a, b) => (a.a !== undefined ? a.a : 255) - (b.a !== undefined ? b.a : 255));
        selectedCustomSwatchIndex = 0;
        showToast('Sorted alpha palette ascending!');
    } else {
        customPalette = PixelArtEncoder.sortPalettePerceptual(customPalette);
        selectedCustomSwatchIndex = 0;
        showToast('Sorted palette by Oklab ΔE (Perceptual Hilbert Curve)!');
    }
    reencode();
});

// Click on source canvas to sample pixel color (Eyedropper)
canvasOriginal.addEventListener('click', (e) => {
    if (!rawLoadedImage || selectedAlgo !== 'user-defined' || !isEyedropperActive) return;

    const rect = canvasOriginal.getBoundingClientRect();
    const scaleX = rawLoadedImage.width / rect.width;
    const scaleY = rawLoadedImage.height / rect.height;
    const px = Math.min(rawLoadedImage.width - 1, Math.max(0, Math.floor((e.clientX - rect.left) * scaleX)));
    const py = Math.min(rawLoadedImage.height - 1, Math.max(0, Math.floor((e.clientY - rect.top) * scaleY)));

    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = rawLoadedImage.width;
    sampleCanvas.height = rawLoadedImage.height;
    const sampleCtx = sampleCanvas.getContext('2d');
    sampleCtx.drawImage(rawLoadedImage, 0, 0);
    const pixel = sampleCtx.getImageData(px, py, 1, 1).data;
    const supportOpacity = opacityToggle.checked;
    const isMono = monochromeToggle.checked;

    if (isMono) {
        const sampledAlpha = supportOpacity ? pixel[3] : 255;
        const color = { r: 255, g: 255, b: 255, a: sampledAlpha };
        if (selectedCustomSwatchIndex >= 0 && selectedCustomSwatchIndex < customPalette.length) {
            customPalette[selectedCustomSwatchIndex] = color;
            showToast(
                `Set alpha #${selectedCustomSwatchIndex + 1}: ${sampledAlpha} (${Math.round((sampledAlpha / 255) * 100)}%)`
            );
        } else {
            customPalette.push(color);
            selectedCustomSwatchIndex = customPalette.length - 1;
            showToast(`Added alpha: ${sampledAlpha} (${Math.round((sampledAlpha / 255) * 100)}%)`);
        }
    } else {
        const color = { r: pixel[0], g: pixel[1], b: pixel[2], a: supportOpacity ? pixel[3] : 255 };
        if (selectedCustomSwatchIndex >= 0 && selectedCustomSwatchIndex < customPalette.length) {
            customPalette[selectedCustomSwatchIndex] = color;
            showToast(`Set color #${selectedCustomSwatchIndex + 1}: rgb(${color.r}, ${color.g}, ${color.b})`);
        } else {
            customPalette.push(color);
            selectedCustomSwatchIndex = customPalette.length - 1;
            showToast(`Added color: rgb(${color.r}, ${color.g}, ${color.b})`);
        }
    }

    reencode();
});

formatB122Btn.addEventListener('click', () => {
    selectedFormat = 'base122';
    formatB122Btn.classList.add('active');
    formatB64Btn.classList.remove('active');
    updatePayloadDisplay();
});

formatB64Btn.addEventListener('click', () => {
    selectedFormat = 'base64';
    formatB64Btn.classList.add('active');
    formatB122Btn.classList.remove('active');
    updatePayloadDisplay();
});

payloadInput.addEventListener('input', () => {
    const str = payloadInput.value.trim();
    if (str.length > 0) {
        try {
            decodeAndRenderPayload(str);
        } catch (err) {
            console.error('Failed to decode pasted payload:', err);
        }
    }
});

stepSlider.addEventListener('input', () => {
    renderReconstructedUpToStep(parseInt(stepSlider.value, 10));
});
formatB122Btn.addEventListener('click', () => {
    selectedFormat = 'base122';
    formatB122Btn.classList.add('active');
    formatB64Btn.classList.remove('active');
    updatePayloadDisplay();
});

copyPayloadBtn.addEventListener('click', () => {
    if (!payloadInput.value) return;
    navigator.clipboard.writeText(payloadInput.value);
    showToast('Payload copied to clipboard!');
});

document.getElementById('copy-ts-btn').addEventListener('click', () => {
    if (!currentEncodedModel) return;
    const payload = selectedFormat === 'base122' ? currentEncodedModel.base122 : currentEncodedModel.base64;
    const snippet = `const pixelArt = new UI.PixelArt({\n    data: '${payload}',\n});`;
    navigator.clipboard.writeText(snippet);
    showToast('TypeScript code copied to clipboard!');
});

stepSlider.addEventListener('input', () => {
    renderReconstructedUpToStep(parseInt(stepSlider.value, 10));
});

playBtn.addEventListener('click', () => {
    togglePlayback();
});

payloadInput.addEventListener('input', () => {
    const text = payloadInput.value.trim();
    if (text.length > 10) {
        try {
            decodeAndRenderPayload(text);
        } catch (err) {
            console.error('Payload decode error:', err);
        }
    }
});

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

/****** File Handling ******/
function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        alert('Please drop or select a valid image file (PNG, JPG, WebP).');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            rawLoadedImage = img;
            renderOriginalImage();
            reencode();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function renderOriginalImage() {
    if (!rawLoadedImage) return;
    canvasOriginal.width = rawLoadedImage.width;
    canvasOriginal.height = rawLoadedImage.height;
    canvasOriginal.style.width = '100%';
    canvasOriginal.style.maxWidth = '100%';
    canvasOriginal.style.maxHeight = '100%';
    canvasOriginal.style.objectFit = 'contain';
    ctxOriginal.clearRect(0, 0, canvasOriginal.width, canvasOriginal.height);
    ctxOriginal.drawImage(rawLoadedImage, 0, 0);
    if (originalDimBadge) {
        originalDimBadge.textContent = `${rawLoadedImage.width} x ${rawLoadedImage.height}`;
    }
}

/****** Quantization & Encoding (via Shared PixelArtEncoder) ******/
function reencode() {
    if (!rawLoadedImage) return;

    const targetDim = parseInt(scaleSlider.value, 10);
    const maxColors = parseInt(colorsSlider.value, 10);
    const isMonochrome = monochromeToggle.checked;
    const supportOpacity = opacityToggle.checked;
    const alphaThreshold = parseInt(alphaThresholdSlider.value, 10);

    // Downsample onto offscreen canvas
    const aspect = rawLoadedImage.width / rawLoadedImage.height;
    let targetW = targetDim;
    let targetH = targetDim;
    if (aspect >= 1) {
        targetH = Math.max(1, Math.round(targetDim / aspect));
    } else {
        targetW = Math.max(1, Math.round(targetDim * aspect));
    }

    const offCanvas = document.createElement('canvas');
    offCanvas.width = targetW;
    offCanvas.height = targetH;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(rawLoadedImage, 0, 0, targetW, targetH);
    const imgData = offCtx.getImageData(0, 0, targetW, targetH).data;

    const pixels = [];
    for (let i = 0; i < targetW * targetH; ++i) {
        pixels.push({
            r: imgData[i * 4],
            g: imgData[i * 4 + 1],
            b: imgData[i * 4 + 2],
            a: imgData[i * 4 + 3],
        });
    }

    // Encode using the shared PixelArtEncoder module
    const encoded = PixelArtEncoder.encodePixelArtFromRgba(pixels, targetW, targetH, {
        maxColors,
        paletteAlgorithm: selectedAlgo,
        customPalette: selectedAlgo === 'user-defined' ? customPalette : undefined,
        monochrome: isMonochrome,
        supportOpacity,
        alphaThreshold,
    });

    currentEncodedModel = encoded;

    // Update UI
    updatePayloadDisplay();
    updateStatsUI(encoded);
    updatePaletteUI(
        isMonochrome ? encoded.palette : selectedAlgo === 'user-defined' ? customPalette : encoded.palette,
        supportOpacity,
        isMonochrome
    );

    stepSlider.max = encoded.rectangles.length;
    stepSlider.value = encoded.rectangles.length;
    renderReconstructedUpToStep(encoded.rectangles.length);
}

function updatePayloadDisplay() {
    if (!currentEncodedModel) return;
    payloadInput.value = selectedFormat === 'base122' ? currentEncodedModel.base122 : currentEncodedModel.base64;
    updateStatsUI(currentEncodedModel);
}

function updateStatsUI(model) {
    document.getElementById('stat-dims').textContent = `${model.width} x ${model.height}`;
    document.getElementById('stat-drawcalls').textContent = model.stats.drawCallCount;
    document.getElementById('stat-reduction').textContent = `-${model.stats.drawCallReductionPercent}% reduction`;
    document.getElementById('stat-bytes').textContent = `${model.stats.byteSize} B`;
    const charCount = selectedFormat === 'base122' ? model.stats.base122Length : model.stats.base64Length;
    document.getElementById('stat-chars').textContent =
        `${charCount} ${selectedFormat === 'base122' ? 'B122' : 'B64'} chars`;
    document.getElementById('stat-precision').textContent = model.is16BitCoords ? '16-bit' : '8-bit';
    document.getElementById('reconstructed-dim-badge').textContent = `${model.width} x ${model.height}`;
}

function updatePaletteUI(palette, hasOpacity, isMonochrome = false) {
    paletteContainer.innerHTML = '';
    if (isMonochrome) {
        paletteCountLabel.textContent = hasOpacity ? `${palette.length} alphas` : '1 alpha (Solid)';
    } else {
        paletteCountLabel.textContent = `${palette.length} colors`;
    }

    palette.forEach((c, idx) => {
        const swatch = document.createElement('div');
        swatch.className = 'palette-swatch';
        if (selectedAlgo === 'user-defined' && idx === selectedCustomSwatchIndex) {
            swatch.classList.add('selected');
        }
        const alpha = hasOpacity ? (c.a !== undefined ? c.a : 255) / 255 : 1;
        const tooltipText = isMonochrome
            ? `#${idx + 1}: Alpha ${c.a !== undefined ? c.a : 255} (${Math.round(alpha * 100)}%)`
            : `#${idx + 1}: rgb(${c.r},${c.g},${c.b}${hasOpacity ? `,${c.a}` : ''})`;
        swatch.style.backgroundColor = isMonochrome
            ? `rgba(255, 255, 255, ${alpha})`
            : `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
        swatch.dataset.tooltip = tooltipText;
        swatch.title = tooltipText;

        if (selectedAlgo === 'user-defined') {
            if (isMonochrome) {
                swatch.addEventListener('click', (e) => {
                    if (e.target.closest('.swatch-delete-btn')) return;
                    if (selectedCustomSwatchIndex === idx) {
                        const curA = customPalette[idx].a !== undefined ? customPalette[idx].a : 255;
                        const input = prompt(`Edit alpha level #${idx + 1} (1-255 or 0.0-1.0):`, curA);
                        if (input !== null && input.trim() !== '') {
                            const p = PixelArtEncoder.parseColor(input);
                            customPalette[idx] = {
                                r: 255,
                                g: 255,
                                b: 255,
                                a: p.a !== undefined ? p.a : 255,
                            };
                            reencode();
                        }
                    } else {
                        selectedCustomSwatchIndex = idx;
                        updatePaletteUI(customPalette, hasOpacity, isMonochrome);
                    }
                });

                swatch.addEventListener('dblclick', (e) => {
                    if (e.target.closest('.swatch-delete-btn')) return;
                    const curA = customPalette[idx].a !== undefined ? customPalette[idx].a : 255;
                    const input = prompt(`Edit alpha level #${idx + 1} (1-255 or 0.0-1.0):`, curA);
                    if (input !== null && input.trim() !== '') {
                        const p = PixelArtEncoder.parseColor(input);
                        customPalette[idx] = { r: 255, g: 255, b: 255, a: p.a !== undefined ? p.a : 255 };
                        reencode();
                    }
                });
            } else {
                // Click to select swatch for eyedropper / editing; click again to open color picker
                swatch.addEventListener('click', (e) => {
                    if (e.target.closest('.swatch-delete-btn')) return;
                    if (selectedCustomSwatchIndex === idx) {
                        openColorPickerForSwatch(idx, swatch);
                    } else {
                        selectedCustomSwatchIndex = idx;
                        updatePaletteUI(customPalette, hasOpacity, isMonochrome);
                    }
                });

                // Double-click to directly open color picker
                swatch.addEventListener('dblclick', (e) => {
                    if (e.target.closest('.swatch-delete-btn')) return;
                    openColorPickerForSwatch(idx, swatch);
                });
            }

            // Delete swatch button
            const delBtn = document.createElement('span');
            delBtn.className = 'swatch-delete-btn';
            delBtn.textContent = '✕';
            delBtn.title = isMonochrome ? 'Remove alpha level' : 'Remove color';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (customPalette.length <= 1) {
                    showToast('Palette must have at least 1 entry!');
                    return;
                }
                customPalette.splice(idx, 1);
                if (selectedCustomSwatchIndex >= customPalette.length) {
                    selectedCustomSwatchIndex = customPalette.length - 1;
                }
                reencode();
            });
            swatch.appendChild(delBtn);
        }

        paletteContainer.appendChild(swatch);
    });
}

/****** Payload Deserializer & Canvas Renderer ******/
function decodeAndRenderPayload(payloadStr) {
    const decoded = PixelArtEncoder.deserializePixelArt(payloadStr);
    const isB122 = PixelArtEncoder.isBase122(payloadStr);
    const base64Str = isB122 ? PixelArtEncoder.bytesToBase64(PixelArtEncoder.base122ToBytes(payloadStr)) : payloadStr;
    const base122Str = isB122 ? payloadStr : PixelArtEncoder.bytesToBase122(PixelArtEncoder.base64ToBytes(payloadStr));
    const rawBytes = isB122 ? PixelArtEncoder.base122ToBytes(payloadStr) : PixelArtEncoder.base64ToBytes(payloadStr);

    currentEncodedModel = {
        width: decoded.width,
        height: decoded.height,
        hasOpacity: decoded.hasOpacity,
        is16BitCoords: decoded.is16BitCoords,
        isMonochrome: decoded.isMonochrome,
        palette: decoded.palette,
        rectangles: decoded.rectangles,
        base64: base64Str,
        base122: base122Str,
        stats: {
            rawPixelCount: decoded.width * decoded.height,
            drawCallCount: decoded.rectangles.length,
            drawCallReductionPercent: Math.round(
                ((decoded.width * decoded.height - decoded.rectangles.length) / (decoded.width * decoded.height)) * 100
            ),
            byteSize: rawBytes.byteLength,
            base64Length: base64Str.length,
            base122Length: base122Str.length,
        },
    };

    updateStatsUI(currentEncodedModel);
    updatePaletteUI(decoded.isMonochrome ? [{ r: 255, g: 255, b: 255, a: 255 }] : decoded.palette, decoded.hasOpacity);
    stepSlider.max = decoded.rectangles.length;
    stepSlider.value = decoded.rectangles.length;
    renderReconstructedUpToStep(decoded.rectangles.length);
}

zoomToggleBtn.addEventListener('click', () => {
    isZoomedToOriginal = !isZoomedToOriginal;
    zoomToggleBtn.classList.toggle('active', isZoomedToOriginal);
    zoomToggleBtn.textContent = isZoomedToOriginal ? '🔍 Match Original Size' : '🔍 1:1 Grid Size';
    applyCanvasScaling();
});

paletteContainer.addEventListener('mouseover', (e) => {
    const swatch = e.target.closest('.palette-swatch');
    if (!swatch || !swatch.dataset.tooltip) return;
    const rect = swatch.getBoundingClientRect();
    swatchTooltip.textContent = swatch.dataset.tooltip;
    swatchTooltip.style.left = `${rect.left + rect.width / 2}px`;
    swatchTooltip.style.top = `${rect.top}px`;
    swatchTooltip.classList.add('show');
});

paletteContainer.addEventListener('mouseout', (e) => {
    const swatch = e.target.closest('.palette-swatch');
    if (swatch) {
        swatchTooltip.classList.remove('show');
    }
});

paletteContainer.addEventListener('scroll', () => {
    swatchTooltip.classList.remove('show');
});

function applyCanvasScaling() {
    if (!currentEncodedModel) return;

    if (isZoomedToOriginal) {
        canvasReconstructed.style.width = '100%';
        canvasReconstructed.style.maxWidth = '100%';
        canvasReconstructed.style.maxHeight = '100%';
        canvasReconstructed.style.objectFit = 'contain';
    } else {
        canvasReconstructed.style.width = currentEncodedModel.width + 'px';
        canvasReconstructed.style.maxWidth = 'none';
        canvasReconstructed.style.maxHeight = 'none';
        canvasReconstructed.style.objectFit = 'none';
    }
}

function renderReconstructedUpToStep(stepCount) {
    if (!currentEncodedModel) return;

    const { width, height, palette, rectangles, hasOpacity } = currentEncodedModel;
    canvasReconstructed.width = width;
    canvasReconstructed.height = height;
    applyCanvasScaling();

    ctxReconstructed.clearRect(0, 0, width, height);

    stepLabel.textContent = `${stepCount} / ${rectangles.length}`;

    for (let i = 0; i < stepCount && i < rectangles.length; ++i) {
        const r = rectangles[i];
        const color = palette[r.paletteIndex] || { r: 0, g: 0, b: 0, a: 255 };
        const alpha = hasOpacity ? color.a / 255 : 1;

        ctxReconstructed.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        ctxReconstructed.fillRect(r.x, r.y, r.w, r.h);
    }
}

function togglePlayback() {
    if (!currentEncodedModel) return;

    if (isPlaying) {
        clearInterval(playInterval);
        playBtn.textContent = '▶';
        isPlaying = false;
        return;
    }

    isPlaying = true;
    playBtn.textContent = '⏸';

    let cur = parseInt(stepSlider.value, 10);
    if (cur >= currentEncodedModel.rectangles.length) {
        cur = 0;
    }

    playInterval = setInterval(() => {
        cur++;
        stepSlider.value = cur;
        renderReconstructedUpToStep(cur);

        if (cur >= currentEncodedModel.rectangles.length) {
            clearInterval(playInterval);
            playBtn.textContent = '▶';
            isPlaying = false;
        }
    }, 30);
}
