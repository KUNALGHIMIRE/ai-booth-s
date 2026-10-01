const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const startButton = document.getElementById("startCamera");
const takeButton = document.getElementById("takePhoto");
const generateButton = document.getElementById("generate");
const retakeButton = document.getElementById("retake");

const styleSelect = document.getElementById("style");
const status = document.getElementById("status");
const filterPanel = document.getElementById("filterPanel");

const result = document.getElementById("result");
const resultImage = document.getElementById("resultImage");
const download = document.getElementById("download");
const qrCode = document.getElementById("qrCode");

const presetButtons = document.querySelectorAll(".preset-btn");
const frameButtons = document.querySelectorAll(".frame-btn");
const intensitySlider = document.getElementById("intensity");
const brightnessSlider = document.getElementById("brightness");
const contrastSlider = document.getElementById("contrast");
const saturationSlider = document.getElementById("saturation");

const intensityVal = document.getElementById("intensityVal");
const brightnessVal = document.getElementById("brightnessVal");
const contrastVal = document.getElementById("contrastVal");
const saturationVal = document.getElementById("saturationVal");

let stream = null;
let currentPreset = "normal";
let currentFrame = "none";

// Instagram-style filter presets
const PRESETS = {
    normal:    { brightness: 1.00, contrast: 1.00, saturate: 1.00, sepia: 0.00, hue: 0,   grayscale: 0.00 },
    clarendon: { brightness: 1.10, contrast: 1.20, saturate: 1.35, sepia: 0.00, hue: 0,   grayscale: 0.00 },
    gingham:   { brightness: 1.05, contrast: 0.90, saturate: 0.85, sepia: 0.00, hue: 0,   grayscale: 0.00 },
    moon:      { brightness: 1.10, contrast: 1.10, saturate: 0.00, sepia: 0.00, hue: 0,   grayscale: 1.00 },
    lark:      { brightness: 1.08, contrast: 0.90, saturate: 1.10, sepia: 0.00, hue: 0,   grayscale: 0.00 },
    reyes:     { brightness: 1.10, contrast: 0.85, saturate: 0.75, sepia: 0.22, hue: 0,   grayscale: 0.00 },
    juno:      { brightness: 1.05, contrast: 1.00, saturate: 1.35, sepia: 0.00, hue: -10, grayscale: 0.00 },
    valencia:  { brightness: 1.08, contrast: 1.08, saturate: 1.10, sepia: 0.15, hue: 0,   grayscale: 0.00 },
};

// =========================
// BUILD CSS FILTER
// =========================
function buildFilter() {
    const preset = PRESETS[currentPreset];
    const intensity = parseInt(intensitySlider.value) / 100;
    const brightnessAdj = parseInt(brightnessSlider.value) / 100;
    const contrastAdj = parseInt(contrastSlider.value) / 100;
    const saturateAdj = parseInt(saturationSlider.value) / 100;

    const blend = (p, n) => n + (p - n) * intensity;

    const brightness = blend(preset.brightness, 1.0) * brightnessAdj;
    const contrast = blend(preset.contrast, 1.0) * contrastAdj;
    const saturate = blend(preset.saturate, 1.0) * saturateAdj;
    const sepia = preset.sepia * intensity;
    const grayscale = preset.grayscale * intensity;
    const hue = preset.hue * intensity;

    return `brightness(${brightness}) contrast(${contrast}) saturate(${saturate}) sepia(${sepia}) grayscale(${grayscale}) hue-rotate(${hue}deg)`;
}

function applyFilter() {
    video.style.filter = buildFilter();
}

function updateLabels() {
    intensityVal.textContent = intensitySlider.value;
    brightnessVal.textContent = brightnessSlider.value;
    contrastVal.textContent = contrastSlider.value;
    saturationVal.textContent = saturationSlider.value;
}

// =========================
// FILTER EVENT LISTENERS
// =========================
presetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        presetButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentPreset = btn.dataset.filter;
        applyFilter();
    });
});

frameButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        frameButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFrame = btn.dataset.frame;
    });
});

[intensitySlider, brightnessSlider, contrastSlider, saturationSlider].forEach(slider => {
    slider.addEventListener("input", () => {
        updateLabels();
        applyFilter();
    });
});

// =========================
// FRAME DRAWING FUNCTIONS
// =========================
function drawFrame() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.save();
    ctx.filter = "none"; // Frames should not be affected by filters

    switch (currentFrame) {

        case "classic": {
            // Black border with white matting
            const outer = Math.min(w, h) * 0.05;
            const inner = outer + Math.min(w, h) * 0.06;

            // Outer black border
            ctx.strokeStyle = "#000";
            ctx.lineWidth = outer * 2;
            ctx.strokeRect(0, 0, w, h);

            // Inner white matting
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = inner - outer;
            ctx.strokeRect(outer, outer, w - outer * 2, h - outer * 2);
            break;
        }

        case "polaroid": {
            // White bottom-heavy polaroid frame
            const side = Math.min(w, h) * 0.05;
            const top = side;
            const bottom = side * 4;

            // White frame overlay
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.rect(0, 0, w, h);
            ctx.rect(side, top, w - side * 2, h - top - bottom);
            ctx.fill();

            // Subtle shadow line at the bottom of the photo
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.lineWidth = 2;
            ctx.strokeRect(side, top, w - side * 2, h - top - bottom);

            // "AI Photo Booth" caption at bottom
            ctx.fillStyle = "#333";
            ctx.font = `italic ${bottom * 0.35}px Georgia`;
            ctx.textAlign = "center";
            ctx.fillText("AI Photo Booth", w / 2, h - bottom * 0.35);
            break;
        }

        case "story": {
            // Instagram/Snapchat-style story border with rounded corners
            const pad = Math.min(w, h) * 0.04;
            const radius = Math.min(w, h) * 0.08;

            // Gradient border
            const gradient = ctx.createLinearGradient(0, 0, w, h);
            gradient.addColorStop(0, "#f09433");
            gradient.addColorStop(0.25, "#e6683c");
            gradient.addColorStop(0.5, "#dc2743");
            gradient.addColorStop(0.75, "#cc2366");
            gradient.addColorStop(1, "#bc1888");

            // Cut out the center with a rounded rect
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.rect(0, 0, w, h);
            ctx.moveTo(pad + radius, pad);
            ctx.arcTo(w - pad, pad, w - pad, h - pad, radius);
            ctx.arcTo(w - pad, h - pad, pad, h - pad, radius);
            ctx.arcTo(pad, h - pad, pad, pad, radius);
            ctx.arcTo(pad, pad, w - pad, pad, radius);
            ctx.closePath();
            ctx.fill("evenodd");
            break;
        }

        case "heart": {
            // Draw heart shapes in the four corners
            const s = Math.min(w, h) * 0.08;
            drawHeart(ctx, s, s, s);
            drawHeart(ctx, w - s, s, s);
            drawHeart(ctx, s, h - s, s);
            drawHeart(ctx, w - s, h - s, s);
            break;
        }

        case "gold": {
            // Double gold border (luxury style)
            const outer = Math.min(w, h) * 0.03;
            const inner = Math.min(w, h) * 0.06;

            const goldGradient = ctx.createLinearGradient(0, 0, w, h);
            goldGradient.addColorStop(0, "#bf953f");
            goldGradient.addColorStop(0.25, "#fcf6ba");
            goldGradient.addColorStop(0.5, "#b38728");
            goldGradient.addColorStop(0.75, "#fbf5b7");
            goldGradient.addColorStop(1, "#aa771c");

            ctx.strokeStyle = goldGradient;
            ctx.lineWidth = outer;
            ctx.strokeRect(outer / 2, outer / 2, w - outer, h - outer);

            ctx.strokeStyle = goldGradient;
            ctx.lineWidth = outer * 0.5;
            ctx.strokeRect(inner, inner, w - inner * 2, h - inner * 2);
            break;
        }

        case "neon": {
            // Glowing purple neon border
            const pad = Math.min(w, h) * 0.04;

            ctx.shadowColor = "#b026ff";
            ctx.shadowBlur = 30;
            ctx.strokeStyle = "#b026ff";
            ctx.lineWidth = 8;
            ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

            // Second pass for brighter glow
            ctx.shadowBlur = 15;
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
            break;
        }

        case "none":
        default:
            // No frame
            break;
    }

    ctx.restore();
}

// Helper to draw a heart shape
function drawHeart(context, x, y, size) {
    context.save();
    context.fillStyle = "#ff3b6b";
    context.beginPath();
    const s = size;
    context.moveTo(x, y + s * 0.3);
    context.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
    context.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s);
    context.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3);
    context.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
    context.fill();
    context.restore();
}

// =========================
// START CAMERA
// =========================
startButton.addEventListener("click", async () => {
    try {
        status.textContent = "Requesting camera...";

        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
            audio: false
        });

        video.srcObject = stream;

        video.onloadedmetadata = () => {
            video.play();
            status.textContent = "Camera ready! Try filters + frames 🎨🖼️";
            startButton.disabled = true;
            takeButton.disabled = false;
            filterPanel.style.display = "block";
            applyFilter();
        };

    } catch (error) {
        console.error("Camera error:", error);
        status.textContent = "Camera error: " + error.name;
        alert("Camera error: " + error.name + "\n" + error.message);
    }
});

// =========================
// TAKE PHOTO (Bake filter + frame into canvas)
// =========================
takeButton.addEventListener("click", () => {
    video.pause();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 1. Draw video with CSS filter applied
    ctx.filter = buildFilter();
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";

    // 2. Draw the frame on top
    drawFrame();

    // Swap visible elements
    video.style.display = "none";
    canvas.style.display = "block";

    status.textContent = "Photo captured! Click Generate.";
    takeButton.disabled = true;
    generateButton.disabled = false;
});

// =========================
// GENERATE (Send to backend)
// =========================
generateButton.addEventListener("click", () => {
    status.textContent = "Processing... 🤖";

    canvas.toBlob(async (blob) => {
        if (!blob) {
            status.textContent = "Could not create photo.";
            return;
        }

        const formData = new FormData();
        formData.append("photo", blob, "photo.png");
        formData.append("style", styleSelect.value);

        try {
            const response = await fetch("/process", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || "Processing failed");

            resultImage.src = data.image_url;
            download.href = data.image_url;
            qrCode.src = data.qr_url;

            result.style.display = "block";
            status.textContent = "Your AI photo is ready! 🎉";
            generateButton.disabled = true;
            retakeButton.disabled = false;

        } catch (error) {
            console.error(error);
            status.textContent = "Error: " + error.message;
            generateButton.disabled = false;
        }
    }, "image/png");
});

// =========================
// RETAKE
// =========================
retakeButton.addEventListener("click", () => {
    result.style.display = "none";
    video.style.display = "block";
    canvas.style.display = "none";

    status.textContent = "Ready for another photo! 📸";
    takeButton.disabled = false;
    generateButton.disabled = true;
    retakeButton.disabled = true;

    video.play();
    applyFilter();
});