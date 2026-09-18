// ========================================
// Twibbon Generator - Main Application
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAAVp8acGErJ2bLM9lbA1kG5NyDjT9Fi9k",
    authDomain: "twibbon-osi-2026-259e1.firebaseapp.com",
    projectId: "twibbon-osi-2026-259e1",
    storageBucket: "twibbon-osi-2026-259e1.firebasestorage.app",
    messagingSenderId: "958517476745",
    appId: "1:958517476745:web:29d8eab6e1d16349cb7558",
    measurementId: "G-QKY6N1JC1H"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cloudinary Configuration
const CLOUD_NAME = 'n9qafiew';
const UPLOAD_PRESET = 'h5j0pysw';

// ========================================
// Utility Functions
// ========================================

/** Escape user-supplied strings to prevent XSS via innerHTML */
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

/** Extract the public_id from a Cloudinary URL (without extension) */
function extractCloudinaryPublicId(url) {
    if (!url) return null;
    // Match after the last /v{digits}/ segment, before the extension
    const match = url.match(/\/v\d+\/(.+)\.[^.]+$/);
    if (match) return match[1];
    // Fallback: after /upload/ (no version in URL)
    const match2 = url.match(/\/upload\/(?:[^/]+\/)*?([^/]+)\.[^.]+$/);
    if (match2) return match2[1];
    return null;
}

/**
 * Build a Cloudinary URL that applies the twibbon overlay server-side.
 * Maps the user's preview-space pan/zoom into Cloudinary crop parameters.
 *
 * How the mapping works:
 *   - CSS `translate(panX,panY)` moves the IMAGE element; panning right (positive panX)
 *     means the visible centre shifts right. In Cloudinary g_center, positive x shifts the
 *     crop window right, showing content more to the right — the same visual effect.
 *     BUT Cloudinary x/y shift the CROP centre, so a positive x means the crop catches
 *     content to the right, which visually pushes the image LEFT. Hence we NEGATE panX.
 *   - CSS `scale(userScale)` around centre maps directly to Cloudinary `z_` zoom.
 */
function buildCloudinaryOverlayUrl(baseSecureUrl, twibbonPublicId, twibbonW, twibbonH, previewRect) {
    const R = twibbonW / previewRect.width;

    // Convert preview-space pan to output-space, negated for Cloudinary coordinate system
    const cx = Math.round(-panX * R);
    const cy = Math.round(-panY * R);
    const zoom = Math.max(0.1, userScale).toFixed(2);

    // Encode public_id for overlay parameter (replace / with :)
    const overlayId = twibbonPublicId.replace(/\//g, ':');

    // Transformation chain:
    //   1. Position user media: c_fill with zoom and optional pan offset
    //   2. Overlay twibbon: l_{id}, sized to match, applied centre-gravity
    //   3. Quality: q_auto for optimal delivery
    const positionParams = `c_fill,w_${twibbonW},h_${twibbonH},g_center,z_${zoom}` +
        (cx !== 0 ? `,x_${cx}` : '') +
        (cy !== 0 ? `,y_${cy}` : '');
    const overlayParams = `l_${overlayId},w_${twibbonW},h_${twibbonH},fl_layer_apply,g_center`;
    const transforms = `${positionParams}/${overlayParams}/q_auto`;

    return baseSecureUrl.replace('/upload/', `/upload/${transforms}/`);
}

/**
 * Insert a thumbnail-size transformation before the /v{digits}/ version segment
 * in a Cloudinary URL.  Works for both old (plain) and new (overlay-transformed) URLs.
 * Set asImage=true for video→JPG thumbnail conversion.
 */
function addThumbnailTransform(url, width, asImage = false) {
    let result = url;
    if (asImage) {
        result = result.replace(/\.[^.\/]+$/, '.jpg');
    }
    const match = result.match(/(\/v\d+\/)/);
    if (match) {
        return result.replace(match[1], `/w_${width},c_scale,q_auto,f_auto${match[1]}`);
    }
    return result.replace('/upload/', `/upload/w_${width},c_scale,q_auto,f_auto/`);
}

/**
 * Chunked/resumable upload to Cloudinary for large files (especially video).
 * Uses 6 MB chunks with X-Unique-Upload-Id header and Content-Range.
 * Retries each chunk up to 3 times with exponential backoff.
 * Falls back to simple single-request upload for files ≤ 6 MB.
 */
async function uploadLargeFile(file, resourceType, onProgress) {
    const CHUNK_SIZE = 6 * 1024 * 1024; // 6 MB
    const uniqueId = 'uqid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);

    // Small files: simple single-request upload
    if (totalChunks <= 1) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
            method: 'POST', body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Upload gagal');
        if (onProgress) onProgress(100);
        return data;
    }

    // Large files: chunked upload
    let result = null;
    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalSize);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk, file.name || `upload.${file.type.split('/')[1] || 'bin'}`);
        formData.append('upload_preset', UPLOAD_PRESET);

        let retries = 0;
        const MAX_RETRIES = 3;

        while (retries <= MAX_RETRIES) {
            try {
                const res = await fetch(
                    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`,
                    {
                        method: 'POST',
                        headers: {
                            'X-Unique-Upload-Id': uniqueId,
                            'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`
                        },
                        body: formData
                    }
                );

                const responseData = await res.json();

                // Only the final chunk returns the full upload result
                if (i === totalChunks - 1) {
                    if (!res.ok) throw new Error(responseData.error?.message || 'Upload gagal');
                    result = responseData;
                }

                if (onProgress) onProgress(Math.round(((i + 1) / totalChunks) * 100));
                break; // chunk succeeded, move to next
            } catch (err) {
                retries++;
                if (retries > MAX_RETRIES) throw new Error(`Upload gagal setelah ${MAX_RETRIES} percobaan: ${err.message}`);
                await new Promise(r => setTimeout(r, 1000 * retries)); // exponential backoff
            }
        }
    }

    return result;
}

// ========================================
// DOM Elements
// ========================================
const fileInput = document.getElementById('mediaUpload');
const uploadLabel = document.getElementById('uploadLabel');
const previewContainer = document.getElementById('previewContainer');
const interactiveArea = document.getElementById('interactiveArea');
const imagePreview = document.getElementById('imagePreview');
const videoPreview = document.getElementById('videoPreview');
const twibbonOverlay = document.getElementById('twibbonOverlay');
const actionContainer = document.getElementById('actionContainer');
const processBtn = document.getElementById('processBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const progressNote = document.getElementById('progressNote');
const zoomSlider = document.getElementById('zoomSlider');
const playPauseBtn = document.getElementById('playPauseBtn');
const playIcon = document.getElementById('playIcon');
const pauseIcon = document.getElementById('pauseIcon');

if(playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
        if (videoPreview.paused) {
            videoPreview.play();
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            videoPreview.pause();
            pauseIcon.classList.add('hidden');
            playIcon.classList.remove('hidden');
        }
    });
}


const participantName = document.getElementById('participantName');
const publicGalleryGrid = document.getElementById('publicGalleryGrid');

// New UI Elements
const editorSection = document.getElementById('editorSection');
const resultSection = document.getElementById('resultSection');
const finalImagePreview = document.getElementById('finalImagePreview');
const finalVideoPreview = document.getElementById('finalVideoPreview');
const retryBtn = document.getElementById('retryBtn');
const downloadPublishBtn = document.getElementById('downloadPublishBtn');
const uploadProgressContainer = document.getElementById('uploadProgressContainer');

// ========================================
// State Variables
// ========================================
let mediaType = null;
let mediaFile = null;
let currentMediaUrl = null;
let finalMediaBlob = null;
let finalMediaExt = null;

let globalTwibbonPhotoUrl = 'twibbon.png';
let globalTwibbonVideoUrl = 'twibbon_video.png';
let globalLabelPhoto = 'Untuk Foto';
let globalLabelVideo = 'Untuk Video';

// ========================================
// Initialize App: Load templates & gallery
// ========================================
async function initApp() {
    try {
        const docRef = doc(db, "settings", "twibbon");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.twibbonPhotoUrl || data.url) {
                globalTwibbonPhotoUrl = data.twibbonPhotoUrl || data.url;
                document.getElementById('previewPhotoTwibbon').src = globalTwibbonPhotoUrl;
            }
            if (data.twibbonVideoUrl) {
                globalTwibbonVideoUrl = data.twibbonVideoUrl;
                document.getElementById('previewVideoTwibbon').src = globalTwibbonVideoUrl;
            }
            if (data.labelPhoto) {
                globalLabelPhoto = data.labelPhoto;
                document.getElementById('selectPhotoTwibbon').querySelector('span').innerText = globalLabelPhoto;
            }
            if (data.labelVideo) {
                globalLabelVideo = data.labelVideo;
                document.getElementById('selectVideoTwibbon').querySelector('span').innerText = globalLabelVideo;
            }
            if (data.logoLeftUrl) document.getElementById('displayLogoLeft').src = data.logoLeftUrl;
            if (data.logoRightUrl) document.getElementById('displayLogoRight').src = data.logoRightUrl;
            if (data.logoTextUrl) document.getElementById('displayLogoText').src = data.logoTextUrl;
        }

        const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        
        window.globalGalleryData = [];
        querySnapshot.forEach((docSnap) => {
            window.globalGalleryData.push(docSnap.data());
        });
        
        renderGallery('all');

        // Setup Gallery Tabs
        document.getElementById('tabAll').addEventListener('click', () => { setActiveTab('tabAll'); renderGallery('all'); });
        document.getElementById('tabPhoto').addEventListener('click', () => { setActiveTab('tabPhoto'); renderGallery('image'); });
        document.getElementById('tabVideo').addEventListener('click', () => { setActiveTab('tabVideo'); renderGallery('video'); });

    } catch (err) {
        console.error("Gagal load initApp:", err);
        publicGalleryGrid.innerHTML = '<p class="text-red-500 text-sm col-span-full text-center py-4">Gagal memuat galeri. Pastikan koneksi internet stabil.</p>';
    }
}

function setActiveTab(activeId) {
    const tabs = ['tabAll', 'tabPhoto', 'tabVideo'];
    tabs.forEach(id => {
        const btn = document.getElementById(id);
        if (id === activeId) {
            btn.className = "px-5 py-2 rounded-full text-sm font-bold bg-navy text-white shadow-md transition-all";
        } else {
            btn.className = "px-5 py-2 rounded-full text-sm font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all";
        }
    });
}

function renderGallery(filterType) {
    publicGalleryGrid.innerHTML = '';
    const filteredData = filterType === 'all' 
        ? window.globalGalleryData 
        : window.globalGalleryData.filter(d => d.type === filterType);

    if (filteredData.length === 0) {
        publicGalleryGrid.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center py-4">Belum ada twibbon di kategori ini.</p>';
        return;
    }

    filteredData.forEach((data) => {
        const safeName = escapeHtml(data.participantName || 'Peserta OSI');
        const safeUrl = escapeHtml(data.url);
        const div = document.createElement('div');
        div.className = "rounded-2xl overflow-hidden border-4 border-white aspect-square shadow-sm hover:shadow-xl transition-all duration-300 relative group hover:-translate-y-2 cursor-pointer bg-slate-100";
        
        let optimizedUrl;
        let playIcon = '';
        let clickAction = '';
        
        if (data.type === 'video') {
            optimizedUrl = addThumbnailTransform(data.url, 300, true);
            playIcon = '<div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors"><div class="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg transform group-hover:scale-110 transition-transform"><svg class="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg></div></div>';
            const streamUrl = addThumbnailTransform(data.url, 360);
            clickAction = `onclick="window.open('${escapeHtml(streamUrl)}', '_blank')"`;
        } else {
            optimizedUrl = addThumbnailTransform(data.url, 300);
            clickAction = `onclick="window.open('${safeUrl}', '_blank')"`;
        }
        
        div.innerHTML = `
            <div ${clickAction} class="w-full h-full relative block">
                <img src="${escapeHtml(optimizedUrl)}" loading="lazy" decoding="async" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Peserta">
                ${playIcon}
                <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-navy/90 via-navy/50 to-transparent p-3 pt-10 translate-y-2 group-hover:translate-y-0 transition-transform">
                    <p class="text-white text-sm font-bold truncate text-center drop-shadow-sm">${safeName}</p>
                </div>
            </div>
        `;
        publicGalleryGrid.appendChild(div);
    });
}
initApp();

// ========================================
// Pan & Zoom
// ========================================
let panX = 0, panY = 0, userScale = 1;
let isDragging = false, startX, startY;
let initialPinchDistance = null;
let initialScale = 1;

function resetTransform() {
    panX = 0; panY = 0; userScale = 1;
    zoomSlider.value = 1;
    updateTransformUI();
}

function updateTransformUI() {
    const transform = `translate(${panX}px, ${panY}px) scale(${userScale})`;
    imagePreview.style.transform = transform;
    videoPreview.style.transform = transform;
}

zoomSlider.addEventListener('input', (e) => {
    userScale = parseFloat(e.target.value);
    updateTransformUI();
});
interactiveArea.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
});
window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransformUI();
});
window.addEventListener('mouseup', () => { isDragging = false; });
interactiveArea.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
    } else if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        initialScale = userScale;
    }
});
interactiveArea.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
        e.preventDefault();
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        updateTransformUI();
    } else if (e.touches.length === 2 && initialPinchDistance) {
        e.preventDefault();
        const currentDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        userScale = initialScale * (currentDistance / initialPinchDistance);
        userScale = Math.max(0.1, Math.min(userScale, 3));
        zoomSlider.value = userScale;
        updateTransformUI();
    }
}, { passive: false });
window.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) initialPinchDistance = null;
    if (e.touches.length === 1) {
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
        isDragging = true;
    } else if (e.touches.length === 0) {
        isDragging = false;
    }
});
interactiveArea.addEventListener('wheel', (e) => {
    e.preventDefault();
    userScale -= e.deltaY * 0.002;
    userScale = Math.max(0.1, Math.min(userScale, 3));
    zoomSlider.value = userScale;
    updateTransformUI();
}, { passive: false });

// ========================================
// Navigation
// ========================================
const templateSelectionSection = document.getElementById('templateSelectionSection');
const selectPhotoTwibbon = document.getElementById('selectPhotoTwibbon');
const selectVideoTwibbon = document.getElementById('selectVideoTwibbon');
const backToTemplatesBtn = document.getElementById('backToTemplatesBtn');
const uploadHintText = document.getElementById('uploadHintText');
const uploadHintSubtext = document.getElementById('uploadHintSubtext');

let selectedTemplateMode = 'photo';

function switchToEditor(mode) {
    selectedTemplateMode = mode;
    templateSelectionSection.classList.add('hidden');
    editorSection.classList.remove('hidden');

    if (mode === 'photo') {
        twibbonOverlay.src = globalTwibbonPhotoUrl;
        uploadHintText.innerText = "Klik untuk memilih " + globalLabelPhoto;
        uploadHintSubtext.innerText = "JPG, PNG (Maksimal 150 MB)";
    } else {
        twibbonOverlay.src = globalTwibbonVideoUrl;
        uploadHintText.innerText = "Klik untuk memilih " + globalLabelVideo;
        uploadHintSubtext.innerText = "MP4, WEBM (Durasi Max. 1 Menit)";
    }
    
    fileInput.value = "";
    previewContainer.classList.add('hidden');
    actionContainer.classList.add('hidden');
    actionContainer.classList.remove('flex');
    imagePreview.src = "";
    videoPreview.removeAttribute('src');
    currentMediaUrl = null;
    mediaFile = null;
}

selectPhotoTwibbon.addEventListener('click', () => switchToEditor('photo'));
selectVideoTwibbon.addEventListener('click', () => switchToEditor('video'));
backToTemplatesBtn.addEventListener('click', () => {
    editorSection.classList.add('hidden');
    templateSelectionSection.classList.remove('hidden');
});

// ========================================
// File Upload
// ========================================
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 150 * 1024 * 1024) {
        alert('Waduh, ukuran filemu terlalu besar! Maksimal 150 MB ya. Coba kompres dulu.');
        fileInput.value = ""; return;
    }
    if (selectedTemplateMode === 'photo' && !file.type.startsWith('image/')) {
        alert(`Kamu memilih mode ${globalLabelPhoto}, tapi file bukan foto.`);
        fileInput.value = ""; return;
    }
    if (selectedTemplateMode === 'video' && !file.type.startsWith('video/')) {
        alert(`Kamu memilih mode ${globalLabelVideo}, tapi file bukan video.`);
        fileInput.value = ""; return;
    }

    if (currentMediaUrl) URL.revokeObjectURL(currentMediaUrl);

    mediaFile = file;
    currentMediaUrl = URL.createObjectURL(file);
    resetTransform();

    if (file.type.startsWith('image/')) {
        mediaType = 'image';
        twibbonOverlay.src = globalTwibbonPhotoUrl;
        videoPreview.classList.add('hidden');
    if(playPauseBtn) playPauseBtn.classList.add('hidden');
        videoPreview.pause();
        videoPreview.removeAttribute('src');
        imagePreview.src = currentMediaUrl;
        if(playPauseBtn) playPauseBtn.classList.add('hidden');
        imagePreview.classList.remove('hidden');
        showPreview();
    } else if (file.type.startsWith('video/')) {
        mediaType = 'video';
        twibbonOverlay.src = globalTwibbonVideoUrl;
        imagePreview.classList.add('hidden');
        imagePreview.src = "";
        videoPreview.src = currentMediaUrl;
        if(playPauseBtn) {
            playPauseBtn.classList.remove('hidden');
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        }
        videoPreview.classList.remove('hidden');
        videoPreview.onloadedmetadata = () => {
            videoPreview.muted = false; // Buka suara di Tahap 2
            if (videoPreview.duration > 61) {
                alert('Durasi video melebihi batas 1 menit.');
                fileInput.value = ""; mediaFile = null;
                previewContainer.classList.add('hidden');
                return;
            }
            videoPreview.play().catch(err => console.log('Autoplay dicegah', err));
            showPreview();
        };
    }
});

function showPreview() {
    previewContainer.classList.remove('hidden');
    actionContainer.classList.remove('hidden');
    actionContainer.classList.add('flex');
    processBtn.disabled = false;
    processBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    progressContainer.classList.add('hidden');
}

// ========================================
// Rendering Video to Canvas
// ========================================
const globalOffCanvas = document.createElement('canvas');
const globalOffCtx = globalOffCanvas.getContext('2d');

function drawCover(ctx, media, canvasWidth, canvasHeight, isVideo) {
    const mediaWidth = isVideo ? media.videoWidth : media.naturalWidth;
    const mediaHeight = isVideo ? media.videoHeight : media.naturalHeight;
    if (!mediaWidth || !mediaHeight) return;

    if (globalOffCanvas.width !== canvasWidth || globalOffCanvas.height !== canvasHeight) {
        globalOffCanvas.width = canvasWidth;
        globalOffCanvas.height = canvasHeight;
    }
    globalOffCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    const scaleCover = Math.max(canvasWidth / mediaWidth, canvasHeight / mediaHeight);
    const defaultW = mediaWidth * scaleCover;
    const defaultH = mediaHeight * scaleCover;
    const defaultX = (canvasWidth - defaultW) / 2;
    const defaultY = (canvasHeight - defaultH) / 2;
    globalOffCtx.drawImage(media, defaultX, defaultY, defaultW, defaultH);

    const previewRect = interactiveArea.getBoundingClientRect();
    const ratioX = canvasWidth / previewRect.width;
    const ratioY = canvasHeight / previewRect.height;
    
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.translate(panX * ratioX, panY * ratioY);
    ctx.scale(userScale, userScale);
    ctx.translate(-canvasWidth / 2, -canvasHeight / 2);
    ctx.drawImage(globalOffCanvas, 0, 0);
    ctx.restore();
}

async function renderBlob() {
    return new Promise(async (resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const tW = (twibbonOverlay.complete && twibbonOverlay.naturalWidth > 0) ? twibbonOverlay.naturalWidth : 1080;
        const tH = (twibbonOverlay.complete && twibbonOverlay.naturalHeight > 0) ? twibbonOverlay.naturalHeight : 1080;
        
        if (mediaType === 'image') {
            canvas.width = tW;
            canvas.height = tH;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawCover(ctx, imagePreview, canvas.width, canvas.height, false);
            if (twibbonOverlay.complete && twibbonOverlay.naturalHeight !== 0) ctx.drawImage(twibbonOverlay, 0, 0, canvas.width, canvas.height);
            
            // Try WebP first (smaller files, ~0.92 quality ≈ JPEG 0.95 visual quality)
            canvas.toBlob((blob) => {
                if (blob) {
                    finalMediaExt = 'webp';
                    resolve(blob);
                } else {
                    // Fallback to JPEG if browser doesn't support WebP encoding
                    canvas.toBlob((jpegBlob) => {
                        finalMediaExt = 'jpg';
                        resolve(jpegBlob);
                    }, 'image/jpeg', 0.95);
                }
            }, 'image/webp', 0.92);

        } else {
            // Video rendering is now handled server-side by Cloudinary.
            // This function is only called for image processing.
            reject(new Error('Video diproses oleh server Cloudinary, bukan di browser.'));
        }
    });
}

// ========================================
// Process Button
// ========================================
processBtn.addEventListener('click', async () => {
    if (!mediaFile) return;

    if (mediaType === 'image') {
        processBtn.disabled = true;
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.innerText = 'Menyiapkan Foto...';
        try {
            finalMediaBlob = await renderBlob();
            showResultPreview(URL.createObjectURL(finalMediaBlob), 'image');
        } catch (e) {
            alert('Gagal: ' + e.message);
            resetUI();
        }
    } else {
        showResultPreview(null, 'video_css');
    }
});

function showResultPreview(url, type) {
    if (type === 'image') {
        editorSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        resultSection.classList.add('flex');
        finalImagePreview.src = url;
        finalImagePreview.classList.remove('hidden');
        finalVideoPreview.classList.add('hidden');
        document.getElementById('cssVideoPreviewBox')?.remove();
    } else if (type === 'video_css') {
        editorSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        resultSection.classList.add('flex');
        finalImagePreview.classList.add('hidden');
        finalVideoPreview.classList.add('hidden');
        
        let box = document.getElementById('cssVideoPreviewBox');
        if (!box) {
            box = document.createElement('div');
            box.id = 'cssVideoPreviewBox';
            box.className = 'w-full h-auto mb-6';
            finalVideoPreview.parentNode.insertBefore(box, finalVideoPreview.nextSibling);
        }
        
        // Pindahkan element asli (TIDAK DI-CLONE)
        box.appendChild(interactiveArea);
        interactiveArea.classList.add('pointer-events-none');
        videoPreview.muted = false; // UNMUTE AUDIO IN STEP 3 PREVIEW
        
        let step3Btn = document.getElementById('step3PlayPauseBtn');
        if (!step3Btn) {
            step3Btn = document.createElement('button');
            step3Btn.id = 'step3PlayPauseBtn';
            step3Btn.className = 'mt-3 w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm';
            step3Btn.innerHTML = `
                <svg class="w-5 h-5 pause-icon" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                <svg class="w-5 h-5 play-icon hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                <span>Jeda Video</span>
            `;
            
            step3Btn.addEventListener('click', () => {
                const pIcon = step3Btn.querySelector('.pause-icon');
                const plIcon = step3Btn.querySelector('.play-icon');
                const span = step3Btn.querySelector('span');
                
                if (videoPreview.paused) {
                    videoPreview.play();
                    pIcon.classList.remove('hidden');
                    plIcon.classList.add('hidden');
                    span.innerText = 'Jeda Video';
                    if (playPauseBtn) {
                        playIcon.classList.add('hidden');
                        pauseIcon.classList.remove('hidden');
                    }
                } else {
                    videoPreview.pause();
                    pIcon.classList.add('hidden');
                    plIcon.classList.remove('hidden');
                    span.innerText = 'Putar Video';
                    if (playPauseBtn) {
                        pauseIcon.classList.add('hidden');
                        playIcon.classList.remove('hidden');
                    }
                }
            });
        }
        
        // Selalu pastikan ditaruh di bawah interactiveArea
        box.appendChild(step3Btn);
        
        // Reset state
        const pIcon = step3Btn.querySelector('.pause-icon');
        const plIcon = step3Btn.querySelector('.play-icon');
        const span = step3Btn.querySelector('span');
        if (videoPreview.paused) {
            pIcon.classList.add('hidden');
            plIcon.classList.remove('hidden');
            span.innerText = 'Putar Video';
        } else {
            pIcon.classList.remove('hidden');
            plIcon.classList.add('hidden');
            span.innerText = 'Jeda Video';
        }
    }
    resetUI();
}

retryBtn.addEventListener('click', () => {
    if (finalImagePreview.src) URL.revokeObjectURL(finalImagePreview.src);
    if (finalVideoPreview.src) URL.revokeObjectURL(finalVideoPreview.src);
    finalMediaBlob = null;
    finalMediaExt = null;
    
    if (interactiveArea.parentNode && interactiveArea.parentNode.id === 'cssVideoPreviewBox') {
        const zoomDiv = zoomSlider.parentNode;
        zoomDiv.parentNode.insertBefore(interactiveArea, zoomDiv);
        interactiveArea.classList.remove('pointer-events-none');
    }
    
    resultSection.classList.add('hidden');
    resultSection.classList.remove('flex');
    editorSection.classList.remove('hidden');
});

// ========================================
// Download & Publish
// ========================================
downloadPublishBtn.addEventListener('click', async () => {
    const nameValue = participantName.value.trim();
    if (nameValue === "") {
        alert("Hei! Isi Nama Panggilan dulu dong sebelum masuk galeri hehe.");
        participantName.focus();
        return;
    }

    downloadPublishBtn.disabled = true;
    retryBtn.disabled = true;
    downloadPublishBtn.classList.add('opacity-50', 'cursor-not-allowed');

    try {
        const tW = (twibbonOverlay.complete && twibbonOverlay.naturalWidth > 0) ? twibbonOverlay.naturalWidth : 1080;
        const tH = (twibbonOverlay.complete && twibbonOverlay.naturalHeight > 0) ? twibbonOverlay.naturalHeight : 1080;
        const previewRect = interactiveArea.getBoundingClientRect();
        const isPhoto = (mediaType === 'image');

        uploadProgressContainer.classList.remove('hidden');

        if (isPhoto) {
            // ── PHOTO FLOW ──────────────────────────────────────────
            // 1. Instant local download (from canvas-rendered WebP/JPEG blob)
            const objectUrl = URL.createObjectURL(finalMediaBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = objectUrl;
            a.download = `Twibbon_OSI_HIMASI_${Date.now()}.${finalMediaExt}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => document.body.removeChild(a), 100);

            // 2. Upload ORIGINAL photo to Cloudinary (not the rendered blob)
            uploadProgressContainer.innerHTML = '<svg class="w-5 h-5 animate-spin text-gold" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span class="text-sm text-slate-600 font-medium">Mengunggah ke Galeri...</span>';

            const cloudData = await uploadLargeFile(mediaFile, 'image');

            if (!cloudData.secure_url) throw new Error("Gagal upload ke Cloudinary");

            // 3. Build server-side overlay URL for gallery
            const twibbonPublicId = extractCloudinaryPublicId(globalTwibbonPhotoUrl);
            const galleryUrl = twibbonPublicId
                ? buildCloudinaryOverlayUrl(cloudData.secure_url, twibbonPublicId, tW, tH, previewRect)
                : cloudData.secure_url; // fallback if twibbon id extraction fails

            // 4. Save overlay URL to Firestore gallery
            await addDoc(collection(db, "gallery"), {
                url: galleryUrl,
                participantName: nameValue,
                type: 'image',
                createdAt: new Date()
            });

        } else {
            // ── VIDEO FLOW ──────────────────────────────────────────
            // 1. Upload ORIGINAL video to Cloudinary (chunked for reliability)
            uploadProgressContainer.innerHTML = '<div class="flex flex-col items-center w-full"><span class="text-sm font-bold text-navy mb-2" id="progressText2">Mengunggah Video...</span><div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div id="progressBar2" class="bg-gold h-2 rounded-full" style="width: 0%"></div></div></div>';

            const cloudData = await uploadLargeFile(mediaFile, 'video', (pct) => {
                const pb2 = document.getElementById('progressBar2');
                const pt2 = document.getElementById('progressText2');
                if (pb2) pb2.style.width = `${pct}%`;
                if (pt2) pt2.innerText = `Mengunggah Video: ${pct}%`;
            });

            if (!cloudData.secure_url) throw new Error("Gagal upload ke Cloudinary");

            // 2. Build server-side overlay URL
            const twibbonPublicId = extractCloudinaryPublicId(globalTwibbonVideoUrl);
            const overlayUrl = twibbonPublicId
                ? buildCloudinaryOverlayUrl(cloudData.secure_url, twibbonPublicId, tW, tH, previewRect)
                : cloudData.secure_url;

            // 3. Download overlayed video via Cloudinary fl_attachment
            //    No double-fetch: we uploaded the RAW video, now downloading the COMPOSED output.
            const uploadText = document.querySelector('#uploadProgressContainer span') || document.getElementById('progressText2');
            if (uploadText) uploadText.innerText = 'Menyiapkan File Download...';

            const downloadUrl = overlayUrl.replace('/upload/', '/upload/fl_attachment/');
            const dlLink = document.createElement('a');
            dlLink.href = downloadUrl;
            dlLink.download = `Twibbon_OSI_HIMASI_${Date.now()}.mp4`;
            dlLink.target = '_blank';
            dlLink.rel = 'noopener noreferrer';
            dlLink.style.display = 'none';
            document.body.appendChild(dlLink);
            dlLink.click();
            setTimeout(() => document.body.removeChild(dlLink), 200);

            // 4. Save overlay URL to Firestore gallery
            await addDoc(collection(db, "gallery"), {
                url: overlayUrl,
                participantName: nameValue,
                type: 'video',
                createdAt: new Date()
            });
        }

        // ── Success state (shared) ──
        initApp();
        uploadProgressContainer.classList.add('hidden');
        document.getElementById('resultActions').classList.add('hidden');
        document.getElementById('successStateContainer')?.classList.remove('hidden');
        document.getElementById('successStateContainer')?.classList.add('flex');

        if (!isPhoto) {
            const note = document.getElementById('videoDurationNote');
            if (note) note.classList.remove('hidden');
        }
    } catch (err) {
        console.error(err);
        alert("Gagal: " + err.message);
        downloadPublishBtn.disabled = false;
        retryBtn.disabled = false;
        downloadPublishBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        uploadProgressContainer.classList.add('hidden');
    }
});

function resetUI() {
    processBtn.disabled = false;
    processBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    uploadLabel.classList.remove('disabled-label');
    fileInput.disabled = false;
    progressContainer.classList.add('hidden');
}
