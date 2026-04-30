// --- DOM ELEMENTS ---
const colorPicker = document.getElementById('colorPicker');
const mainPreview = document.getElementById('mainPreview');
const hexVal = document.getElementById('hexVal');
const rgbVal = document.getElementById('rgbVal');
const hslVal = document.getElementById('hslVal');
const copyBtns = document.querySelectorAll('.copy-btn');

const imageUpload = document.getElementById('imageUpload');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true }); // Tối ưu cho việc đọc pixel liên tục
const hoverTooltip = document.getElementById('hoverTooltip');
const hoverColor = document.getElementById('hoverColor');
const hoverText = document.getElementById('hoverText');

// --- COLOR CONVERSION UTILITIES ---
// Chuyển đổi HEX sang RGB
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    const bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

// Chuyển đổi RGB sang HEX
function rgbToHex(r, g, b) {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
}

// Chuyển đổi RGB sang HSL
function rgbToHsl(r, g, b) {
    r /= 255, g /= 255, b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // xám
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
}

// Cập nhật toàn bộ UI khi có một mã màu HEX mới
function updateColorUI(hex) {
    const rgbObj = hexToRgb(hex);
    const rgbStr = `rgb(${rgbObj.r}, ${rgbObj.g}, ${rgbObj.b})`;
    const hslStr = rgbToHsl(rgbObj.r, rgbObj.g, rgbObj.b);

    mainPreview.style.backgroundColor = hex;
    colorPicker.value = hex;
    hexVal.value = hex;
    rgbVal.value = rgbStr;
    hslVal.value = hslStr;
}

// Khởi tạo màu mặc định ban đầu
updateColorUI(colorPicker.value);

// --- EVENT LISTENERS CHO BỘ CHỌN MÀU ---
colorPicker.addEventListener('input', (e) => {
    updateColorUI(e.target.value);
});

copyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const inputToCopy = document.getElementById(targetId);
        
        navigator.clipboard.writeText(inputToCopy.value).then(() => {
            const originalText = btn.innerText;
            btn.innerText = "Copied!";
            setTimeout(() => btn.innerText = originalText, 1500);
        });
    });
});

// --- LOGIC XỬ LÝ ẢNH & CANVAS ---
let imageLoaded = false;

// Xử lý khi upload ảnh
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            // Set kích thước thật của canvas bằng với ảnh gốc
            canvas.width = img.width;
            canvas.height = img.height;
            // Vẽ ảnh lên canvas
            ctx.drawImage(img, 0, 0);
            imageLoaded = true;
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
});

// Hàm quan trọng: Lấy màu pixel từ tọa độ chuột
function getPixelColor(e) {
    // 1. Lấy kích thước hiển thị thực tế của canvas trên màn hình (vì CSS có max-width: 100%)
    const rect = canvas.getBoundingClientRect();
    
    // 2. Tính toán tỷ lệ chênh lệch giữa kích thước thật của ảnh (canvas.width) và kích thước hiển thị (rect.width)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // 3. Lấy tọa độ chuột (e.clientX/Y), trừ đi lề của canvas (rect.left/top) để ra tọa độ tương đối
    // Sau đó nhân với tỷ lệ (scale) để map chính xác vào tọa độ pixel của ảnh gốc
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // 4. Đọc dữ liệu mảng [R, G, B, A] tại tọa độ x, y
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    
    return rgbToHex(pixel[0], pixel[1], pixel[2]);
}

// Hover (Di chuyển chuột) trên Canvas -> Hiển thị Tooltip
canvas.addEventListener('mousemove', (e) => {
    if (!imageLoaded) return;

    const hexColor = getPixelColor(e);
    
    // Cập nhật nội dung Tooltip
    hoverTooltip.classList.remove('hidden');
    hoverColor.style.backgroundColor = hexColor;
    hoverText.innerText = hexColor;

    // Di chuyển Tooltip bám theo chuột (Lấy tọa độ chuột trong phạm vi container)
    const containerRect = canvas.parentElement.getBoundingClientRect();
    const tooltipX = e.clientX - containerRect.left;
    const tooltipY = e.clientY - containerRect.top;
    
    hoverTooltip.style.left = `${tooltipX}px`;
    hoverTooltip.style.top = `${tooltipY}px`;
});

// Khi đưa chuột ra khỏi canvas -> Ẩn Tooltip
canvas.addEventListener('mouseleave', () => {
    hoverTooltip.classList.add('hidden');
});

// Click vào Canvas -> Chốt màu lên Bảng điều khiển chính
canvas.addEventListener('click', (e) => {
    if (!imageLoaded) return;
    const hexColor = getPixelColor(e);
    updateColorUI(hexColor);
});