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
const uploadProgressText = document.getElementById('uploadProgressText');

// ========================================
// State Variables
// ========================================
let mediaType = null;
let mediaFile = null;
let currentMediaUrl = null;
let finalMediaBlob = null;
let finalMediaExt = null;

let globalTwibbonPhotoUrl = 'twibbon.png';
let globalTwibbonVideoUrl = 'twibbon_video.png'; // fallback if not set
let globalLabelPhoto = 'Untuk Foto';
let globalLabelVideo = 'Untuk Video';

// ========================================
// Initialize App: Load templates & gallery
// ========================================
async function initApp() {
    try {
        // 1. Load Dynamic Template from Admin Settings
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

        // 2. Load Gallery
        const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        
        publicGalleryGrid.innerHTML = '';
        if (querySnapshot.empty) {
            publicGalleryGrid.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center py-4">Belum ada twibbon di galeri. Jadilah yang pertama!</p>';
        } else {
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const div = document.createElement('div');
                div.className = "rounded-2xl overflow-hidden border-4 border-white aspect-square shadow-sm hover:shadow-xl transition-all duration-300 relative group hover:-translate-y-2 cursor-pointer bg-slate-100";
                
                let optimizedUrl = data.url;
                let playIcon = '';
                let clickAction = '';
                
                if (data.type === 'video') {
                    // Cloudinary: Get .jpg thumbnail of the video
                    let baseVideoUrl = data.url.split('.').slice(0, -1).join('.');
                    optimizedUrl = baseVideoUrl.replace('/upload/', '/upload/w_400,q_auto,f_auto/') + '.jpg';
                    playIcon = '<div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors"><div class="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg transform group-hover:scale-110 transition-transform"><svg class="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg></div></div>';
                    // Streaming: pakai resolusi 480p supaya ringan saat ditonton
                    const streamUrl = data.url.replace('/upload/', '/upload/w_480,q_auto/');
                    clickAction = `onclick="window.open('${streamUrl}', '_blank')"`;
                } else {
                    optimizedUrl = data.url.replace('/upload/', '/upload/w_400,q_auto,f_auto/');
                    clickAction = `onclick="window.open('${data.url}', '_blank')"`;
                }
                
                div.innerHTML = `
                    <div ${clickAction} class="w-full h-full relative block">
                        <img src="${optimizedUrl}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Peserta">
                        ${playIcon}
                        <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-navy/90 via-navy/50 to-transparent p-3 pt-10 translate-y-2 group-hover:translate-y-0 transition-transform">
                            <p class="text-white text-sm font-bold truncate text-center drop-shadow-sm">${data.participantName || 'Peserta OSI'}</p>
                        </div>
                    </div>
                `;
                publicGalleryGrid.appendChild(div);
            });
        }
    } catch (e) {
        console.error("Gagal inisialisasi:", e);
        publicGalleryGrid.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center py-4">Gagal memuat galeri.</p>';
    }
}

// Run init on load
initApp();

// ========================================
// Pan & Zoom Variables
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

// ========================================
// Event Listeners: Pan & Zoom
// ========================================
zoomSlider.addEventListener('input', (e) => {
    userScale = parseFloat(e.target.value);
    updateTransformUI();
});

// Mouse Pan
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

// Touch Pan & Zoom (Pinch)
interactiveArea.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
    } else if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = userScale;
    }
});
interactiveArea.addEventListener('touchmove', (e) => {
    e.preventDefault(); // Prevent page scroll
    if (e.touches.length === 1 && isDragging) {
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        updateTransformUI();
    } else if (e.touches.length === 2 && initialPinchDistance) {
        const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        userScale = initialScale * (currentDistance / initialPinchDistance);
        userScale = Math.max(0.1, Math.min(userScale, 3));
        zoomSlider.value = userScale;
        updateTransformUI();
    }
}, { passive: false });
window.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
        initialPinchDistance = null;
    }
    if (e.touches.length === 1) {
        // Restart drag from current single touch to prevent jumping
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
        isDragging = true;
    } else if (e.touches.length === 0) {
        isDragging = false;
    }
});

// Mouse Wheel Zoom
interactiveArea.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSensitivity = 0.002;
    userScale -= e.deltaY * zoomSensitivity;
    userScale = Math.max(0.1, Math.min(userScale, 3));
    zoomSlider.value = userScale;
    updateTransformUI();
}, { passive: false });

// ========================================
// Navigation: Template Selection ↔ Editor
// ========================================
const templateSelectionSection = document.getElementById('templateSelectionSection');
const selectPhotoTwibbon = document.getElementById('selectPhotoTwibbon');
const selectVideoTwibbon = document.getElementById('selectVideoTwibbon');
const backToTemplatesBtn = document.getElementById('backToTemplatesBtn');
const uploadHintText = document.getElementById('uploadHintText');
const uploadHintSubtext = document.getElementById('uploadHintSubtext');

let selectedTemplateMode = 'photo'; // default

function switchToEditor(mode) {
    selectedTemplateMode = mode;
    templateSelectionSection.classList.add('hidden');
    editorSection.classList.remove('hidden');

    if (mode === 'photo') {
        twibbonOverlay.src = globalTwibbonPhotoUrl;
        // fileInput.accept = "image/*"; // Removed accept due to Xiaomi bug
        uploadHintText.innerText = "Klik untuk memilih " + globalLabelPhoto;
        uploadHintSubtext.innerText = "JPG, PNG (Maksimal 150 MB)";
    } else {
        twibbonOverlay.src = globalTwibbonVideoUrl;
        // fileInput.accept = "video/*"; // Removed accept due to Xiaomi bug
        uploadHintText.innerText = "Klik untuk memilih " + globalLabelVideo;
        uploadHintSubtext.innerText = "MP4, WEBM (Durasi Max. 1 Menit)";
    }
    
    // Clean up old state if switching modes
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
// File Upload Handler
// ========================================
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Batas maksimal 150MB
    if (file.size > 150 * 1024 * 1024) {
        alert('Waduh, ukuran filemu terlalu besar! Maksimal 150 MB ya. Coba kompres dulu.');
        fileInput.value = "";
        return;
    }

    // Validasi mode vs tipe file
    if (selectedTemplateMode === 'photo' && !file.type.startsWith('image/')) {
        alert(`Kamu memilih mode ${globalLabelPhoto}, tapi file yang dipilih bukan foto. Silakan pilih foto, atau kembali dan pilih mode lainnya.`);
        fileInput.value = "";
        return;
    }
    if (selectedTemplateMode === 'video' && !file.type.startsWith('video/')) {
        alert(`Kamu memilih mode ${globalLabelVideo}, tapi file yang dipilih bukan video. Silakan pilih video, atau kembali dan pilih mode lainnya.`);
        fileInput.value = "";
        return;
    }

    if (currentMediaUrl) {
        URL.revokeObjectURL(currentMediaUrl);
    }

    mediaFile = file;
    currentMediaUrl = URL.createObjectURL(file);
    resetTransform(); // Reset posisi gambar tiap upload baru

    if (file.type.startsWith('image/')) {
        mediaType = 'image';
        twibbonOverlay.src = globalTwibbonPhotoUrl;
        
        videoPreview.classList.add('hidden');
        videoPreview.pause();
        videoPreview.removeAttribute('src');
        videoPreview.load(); 
        
        imagePreview.src = currentMediaUrl;
        imagePreview.classList.remove('hidden');
        
        showPreview();
    } else if (file.type.startsWith('video/')) {
        mediaType = 'video';
        twibbonOverlay.src = globalTwibbonVideoUrl;
        
        imagePreview.classList.add('hidden');
        imagePreview.src = "";
        
        videoPreview.src = currentMediaUrl;
        videoPreview.classList.remove('hidden');
        
        videoPreview.onloadedmetadata = () => {
            if (videoPreview.duration > 61) {
                alert('Durasi video melebihi batas maksimal 1 menit (60 detik). Silakan pilih video yang lebih pendek.');
                fileInput.value = "";
                mediaFile = null;
                previewContainer.classList.add('hidden');
                actionContainer.classList.add('hidden');
                return;
            }
            videoPreview.play().catch(err => console.log('Autoplay dicegah browser, aman diabaikan.', err));
            showPreview();
        };

        videoPreview.onerror = () => {
            alert('Format video tidak didukung atau file rusak.');
        };
    } else {
        alert('Format file tidak didukung. Harap unggah Gambar atau Video.');
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
// Canvas Rendering (Cover Fit + Pan/Zoom)
// ========================================

// Gunakan satu offscreen canvas secara global agar tidak terjadi memory leak saat merender video frame-by-frame
const globalOffCanvas = document.createElement('canvas');
const globalOffCtx = globalOffCanvas.getContext('2d');

function drawCover(ctx, media, canvasWidth, canvasHeight, isVideo) {
    const mediaWidth = isVideo ? media.videoWidth : media.naturalWidth;
    const mediaHeight = isVideo ? media.videoHeight : media.naturalHeight;
    
    if (!mediaWidth || !mediaHeight) return;

    // Pastikan ukuran offscreen canvas sesuai
    if (globalOffCanvas.width !== canvasWidth || globalOffCanvas.height !== canvasHeight) {
        globalOffCanvas.width = canvasWidth;
        globalOffCanvas.height = canvasHeight;
    }

    // Bersihkan offscreen canvas sebelum menggambar
    globalOffCtx.clearRect(0, 0, canvasWidth, canvasHeight);

    const scaleCover = Math.max(canvasWidth / mediaWidth, canvasHeight / mediaHeight);
    const defaultW = mediaWidth * scaleCover;
    const defaultH = mediaHeight * scaleCover;
    const defaultX = (canvasWidth - defaultW) / 2;
    const defaultY = (canvasHeight - defaultH) / 2;
    
    globalOffCtx.drawImage(media, defaultX, defaultY, defaultW, defaultH);

    // 2. Terapkan pan & zoom ke offscreen canvas (yang sudah ter-crop) ke main canvas
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

// ========================================
// Process Button: Render Twibbon
// ========================================
processBtn.addEventListener('click', async () => {
    if (!mediaFile) return;

    // Trik khusus untuk HP (iOS/Android) agar video bisa diputar
    if (mediaType === 'video') {
        videoPreview.muted = true;
        videoPreview.play().catch(e => console.log('Bypass play', e));
        videoPreview.pause();
    }

    processBtn.disabled = true;
    processBtn.classList.add('opacity-50', 'cursor-not-allowed');
    uploadLabel.classList.add('disabled-label');
    fileInput.disabled = true;
    
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.innerText = 'Menyiapkan...';

    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const twibbonWidth = (twibbonOverlay.complete && twibbonOverlay.naturalWidth > 0) ? twibbonOverlay.naturalWidth : 1080;
        const twibbonHeight = (twibbonOverlay.complete && twibbonOverlay.naturalHeight > 0) ? twibbonOverlay.naturalHeight : 1080;
        
        canvas.width = twibbonWidth;
        canvas.height = twibbonHeight;

        if (mediaType === 'image') {
            progressText.innerText = 'Merender Foto Resolusi Tinggi...';
            progressBar.style.width = '50%';
            
            if (!imagePreview.complete) {
                await new Promise((resolve, reject) => { 
                    imagePreview.onload = resolve; 
                    imagePreview.onerror = reject;
                });
            }

            // Beri warna dasar putih agar jika ada bagian transparan tidak menjadi hitam di JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            drawCover(ctx, imagePreview, canvas.width, canvas.height, false);
            if (twibbonOverlay.complete && twibbonOverlay.naturalHeight !== 0) {
                ctx.drawImage(twibbonOverlay, 0, 0, canvas.width, canvas.height);
            }

            progressBar.style.width = '100%';
            
            // Gunakan JPEG dengan kualitas 90% agar ukuran file jauh lebih kecil (< 10MB)
            canvas.toBlob((blob) => {
                finalMediaBlob = blob;
                finalMediaExt = 'jpg';
                showResultPreview(URL.createObjectURL(blob), 'image');
            }, 'image/jpeg', 0.90);

        } else if (mediaType === 'video') {
            progressText.innerText = 'Merender Video (Resolusi Penuh)...';
            progressNote.innerText = "Proses rendering video HD memakan waktu lebih lama. Mohon tetap buka layar ini.";

            // Unmute video agar audio track bisa ditangkap oleh browser
            videoPreview.muted = false;
            videoPreview.currentTime = 0;
            videoPreview.loop = false;
            
            await videoPreview.play().catch(err => {
                throw new Error('Gagal memutar video untuk direkam.');
            });

            const stream = canvas.captureStream(30);
            
            // Ambil audio dari video asli dan gabungkan ke stream Canvas
            try {
                const audioStream = videoPreview.captureStream ? videoPreview.captureStream() : (videoPreview.mozCaptureStream ? videoPreview.mozCaptureStream() : null);
                if (audioStream) {
                    const audioTracks = audioStream.getAudioTracks();
                    if (audioTracks.length > 0) {
                        stream.addTrack(audioTracks[0]);
                    }
                }
            } catch (err) {
                console.warn("Gagal menambahkan audio:", err);
            }
            
            let mimeType = 'video/webm';
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
                mimeType = 'video/webm;codecs=vp9';
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
                mimeType = 'video/mp4';
            }

            let mediaRecorder;
            try {
                mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: 8000000 });
            } catch (e) {
                mediaRecorder = new MediaRecorder(stream);
            }
            
            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                try {
                    finalMediaBlob = new Blob(chunks, { type: mediaRecorder.mimeType || mimeType });
                    finalMediaExt = (mediaRecorder.mimeType || mimeType).includes('mp4') ? 'mp4' : 'webm';
                    showResultPreview(URL.createObjectURL(finalMediaBlob), 'video');
                } catch (err) {
                    console.error(err);
                    alert('Gagal memproses file video akhir.');
                    resetUI();
                } finally {
                    videoPreview.muted = true; // Bisukan kembali video sumber
                    videoPreview.pause();
                }
            };

            mediaRecorder.start(100); 

            const duration = videoPreview.duration || 1;
            let lastDrawTime = 0;
            const frameInterval = 1000 / 30; // Batasi 30 FPS agar tidak berat

            const drawFrame = (timestamp) => {
                if (videoPreview.paused || videoPreview.ended) {
                    if (mediaRecorder.state === 'recording') {
                        mediaRecorder.stop();
                    }
                    return;
                }

                // Hanya gambar jika sudah waktunya (throttle FPS)
                if (timestamp - lastDrawTime >= frameInterval) {
                    lastDrawTime = timestamp;

                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    drawCover(ctx, videoPreview, canvas.width, canvas.height, true);
                    if (twibbonOverlay.complete && twibbonOverlay.naturalHeight !== 0) {
                        ctx.drawImage(twibbonOverlay, 0, 0, canvas.width, canvas.height);
                    }

                    const current = videoPreview.currentTime;
                    const percent = Math.min((current / duration) * 100, 100).toFixed(1);
                    progressBar.style.width = `${percent}%`;
                    progressText.innerText = `Memproses Video HD: ${percent}%`;
                }

                requestAnimationFrame(drawFrame);
            };

            requestAnimationFrame(drawFrame);
        }
    } catch (error) {
        console.error(error);
        alert('Terjadi kesalahan saat memproses media: ' + error.message);
        resetUI();
    }
});

// ========================================
// Back Button (Step 2 → Step 1)
// ========================================
document.getElementById('backToTemplatesBtn').addEventListener('click', () => {
    editorSection.classList.add('hidden');
    document.getElementById('templateSelectionSection').classList.remove('hidden');
    document.getElementById('templateSelectionSection').classList.add('flex');
    
    // Reset upload form
    fileInput.value = "";
    mediaFile = null;
    if (currentMediaUrl) {
        URL.revokeObjectURL(currentMediaUrl);
        currentMediaUrl = null;
    }
    if (mediaType === 'video') {
        videoPreview.pause();
        videoPreview.removeAttribute('src');
        videoPreview.load();
    } else {
        imagePreview.src = "";
    }
    
    previewContainer.classList.add('hidden');
    actionContainer.classList.add('hidden');
    actionContainer.classList.remove('flex');
    resetTransform();
});

// ========================================
// Result Preview (Step 3)
// ========================================
function showResultPreview(url, type) {
    editorSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    resultSection.classList.add('flex');
    
    if (type === 'image') {
        finalImagePreview.src = url;
        finalImagePreview.classList.remove('hidden');
        finalVideoPreview.classList.add('hidden');
    } else {
        finalVideoPreview.src = url;
        finalVideoPreview.classList.remove('hidden');
        finalImagePreview.classList.add('hidden');
    }
    resetUI(); // reset background state
}

// --- Step 3 Actions ---
retryBtn.addEventListener('click', () => {
    // Revoke object URL to free memory
    if (finalImagePreview.src) URL.revokeObjectURL(finalImagePreview.src);
    if (finalVideoPreview.src) URL.revokeObjectURL(finalVideoPreview.src);
    
    finalMediaBlob = null;
    finalMediaExt = null;
    
    resultSection.classList.add('hidden');
    resultSection.classList.remove('flex');
    editorSection.classList.remove('hidden');
    
    // Note: Keep the chosen file in case they just want to adjust pan/zoom
});

// ========================================
// Download & Publish to Gallery
// ========================================
downloadPublishBtn.addEventListener('click', async () => {
    if (!finalMediaBlob) return;

    const nameValue = participantName.value.trim();
    if (nameValue === "") {
        alert("Hei! Isi Nama Panggilan dulu dong sebelum masuk galeri hehe.");
        participantName.focus();
        return;
    }

    // 1. Download to device immediately (FULL RESOLUTION)
    const objectUrl = finalImagePreview.src || finalVideoPreview.src || URL.createObjectURL(finalMediaBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = objectUrl;
    a.download = `Twibbon_OSI_HIMASI_${Date.now()}.${finalMediaExt}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);

    // 2. Upload to Cloudinary & Firestore
    downloadPublishBtn.disabled = true;
    retryBtn.disabled = true;
    downloadPublishBtn.classList.add('opacity-50', 'cursor-not-allowed');
    uploadProgressContainer.classList.remove('hidden');

    try {
        // Foto: buat versi low-res (480px) untuk galeri agar ringan
        // Video: upload as-is, pakai Cloudinary transformation saat tampilkan
        let uploadBlob = finalMediaBlob;
        const isPhoto = (finalMediaExt === 'jpg' || finalMediaExt === 'png');
        
        if (isPhoto) {
            try {
                uploadBlob = await createLowResImageBlob(finalMediaBlob, 480);
                console.log(`Galeri: ${(finalMediaBlob.size/1024).toFixed(0)}KB → ${(uploadBlob.size/1024).toFixed(0)}KB`);
            } catch (compressErr) {
                console.warn('Gagal kompres, upload versi asli:', compressErr);
                uploadBlob = finalMediaBlob; // fallback ke asli
            }
        }

        const formData = new FormData();
        formData.append('file', uploadBlob, `twibbon.${finalMediaExt}`);
        formData.append('upload_preset', UPLOAD_PRESET);
        
        const endpoint = isPhoto ? 'image/upload' : 'video/upload';
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}`, {
            method: 'POST',
            body: formData
        });
        const cloudData = await res.json();
        
        if (res.ok && cloudData.secure_url) {
            await addDoc(collection(db, "gallery"), {
                url: cloudData.secure_url,
                participantName: nameValue,
                type: isPhoto ? 'image' : 'video',
                createdAt: new Date()
            });
            initApp(); // refresh gallery
            
            // Sembunyikan progress & tombol aksi lama
            uploadProgressContainer.classList.add('hidden');
            document.getElementById('resultActions').classList.add('hidden');
            // Tampilkan status sukses
            document.getElementById('successStateContainer').classList.remove('hidden');
            document.getElementById('successStateContainer').classList.add('flex');
            
        } else {
            console.error("Cloudinary Error Data:", cloudData);
            throw new Error(cloudData.error ? cloudData.error.message : "Gagal mendapatkan URL dari Cloudinary");
        }
    } catch (err) {
        console.error("Gagal mengunggah ke galeri:", err);
        alert("Gagal diupload ke Galeri: " + err.message);
        downloadPublishBtn.disabled = false;
        retryBtn.disabled = false;
        downloadPublishBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        uploadProgressContainer.classList.add('hidden');
    }
});

// ========================================
// Utility: Low-Res Image for Gallery Upload
// ========================================
function createLowResImageBlob(fullResBlob, maxSize) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            try {
                const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
                const smallCanvas = document.createElement('canvas');
                smallCanvas.width = Math.round(img.width * scale);
                smallCanvas.height = Math.round(img.height * scale);
                const sCtx = smallCanvas.getContext('2d');
                sCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
                smallCanvas.toBlob((blob) => {
                    URL.revokeObjectURL(img.src); // Bersihkan memory
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Gagal membuat versi galeri'));
                    }
                }, 'image/jpeg', 0.70);
            } catch (err) {
                reject(err);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Gagal memuat gambar untuk dikompres'));
        };
        img.src = URL.createObjectURL(fullResBlob);
    });
}

// ========================================
// Utility: Reset UI State
// ========================================
function resetUI() {
    processBtn.disabled = false;
    processBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    uploadLabel.classList.remove('disabled-label');
    fileInput.disabled = false;
    progressContainer.classList.add('hidden');
}
