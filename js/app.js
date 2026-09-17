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
                    let baseVideoUrl = data.url.split('.').slice(0, -1).join('.');
                    optimizedUrl = baseVideoUrl.replace('/upload/', '/upload/w_400,q_auto,f_auto/') + '.jpg';
                    playIcon = '<div class="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors"><div class="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg transform group-hover:scale-110 transition-transform"><svg class="w-6 h-6 text-gold" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4l12 6-12 6z"></path></svg></div></div>';
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
        videoPreview.pause();
        videoPreview.removeAttribute('src');
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
            
            canvas.toBlob((blob) => {
                finalMediaExt = 'jpg';
                resolve(blob);
            }, 'image/jpeg', 0.90);

        } else if (mediaType === 'video') {
            const MAX_VID_DIM = 800;
            const scaleDown = Math.min(MAX_VID_DIM / tW, MAX_VID_DIM / tH, 1);
            canvas.width = Math.round(tW * scaleDown);
            canvas.height = Math.round(tH * scaleDown);

            videoPreview.muted = false;
            videoPreview.currentTime = 0;
            videoPreview.loop = false;
            await videoPreview.play().catch(e => reject(e));

            const stream = canvas.captureStream(30);
            try {
                const audioStream = videoPreview.captureStream ? videoPreview.captureStream() : (videoPreview.mozCaptureStream ? videoPreview.mozCaptureStream() : null);
                if (audioStream && audioStream.getAudioTracks().length > 0) {
                    stream.addTrack(audioStream.getAudioTracks()[0]);
                }
            } catch (err) { console.warn("No audio:", err); }

            let mimeType = 'video/webm';
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) mimeType = 'video/webm;codecs=vp9';
            else if (MediaRecorder.isTypeSupported('video/mp4')) mimeType = 'video/mp4';
            else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) mimeType = 'video/webm;codecs=vp8';

            let mediaRecorder;
            try {
                mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: 4000000 });
            } catch (e) {
                mediaRecorder = new MediaRecorder(stream);
            }

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            mediaRecorder.onstop = () => {
                try {
                    const blob = new Blob(chunks, { type: mediaRecorder.mimeType || mimeType });
                    finalMediaExt = (mediaRecorder.mimeType || mimeType).includes('mp4') ? 'mp4' : 'webm';
                    resolve(blob);
                } catch (err) { reject(err); }
                finally {
                    videoPreview.muted = true;
                    videoPreview.pause();
                }
            };
            
            mediaRecorder.start(100);
            const duration = videoPreview.duration || 1;
            let lastDrawTime = 0;
            const frameInterval = 1000 / 30;
            
            const drawFrame = (timestamp) => {
                if (videoPreview.paused || videoPreview.ended) {
                    if (mediaRecorder.state === 'recording') mediaRecorder.stop();
                    return;
                }
                if (timestamp - lastDrawTime >= frameInterval) {
                    lastDrawTime = timestamp;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    drawCover(ctx, videoPreview, canvas.width, canvas.height, true);
                    if (twibbonOverlay.complete && twibbonOverlay.naturalHeight !== 0) ctx.drawImage(twibbonOverlay, 0, 0, canvas.width, canvas.height);
                    
                    const percent = Math.min((videoPreview.currentTime / duration) * 100, 100).toFixed(1);
                    if (progressBar) progressBar.style.width = `${percent}%`;
                    if (progressText) progressText.innerText = `Memproses Video: ${percent}%`;
                }
                requestAnimationFrame(drawFrame);
            };
            requestAnimationFrame(drawFrame);
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
            box.className = 'w-full h-auto aspect-square overflow-hidden relative pointer-events-none mb-6 rounded-2xl shadow-xl';
            finalVideoPreview.parentNode.insertBefore(box, finalVideoPreview.nextSibling);
        }
        box.innerHTML = '';
        const cloneContainer = previewContainer.cloneNode(true);
        cloneContainer.id = 'clonedPreviewContainer';
        cloneContainer.classList.remove('hidden');
        cloneContainer.style.width = '100%';
        cloneContainer.style.height = '100%';
        
        const clonedVideo = cloneContainer.querySelector('#videoPreview');
        clonedVideo.src = videoPreview.src;
        clonedVideo.style.transform = videoPreview.style.transform;
        clonedVideo.play().catch(e=>console.log(e));
        
        box.appendChild(cloneContainer);
    }
    resetUI();
}

retryBtn.addEventListener('click', () => {
    if (finalImagePreview.src) URL.revokeObjectURL(finalImagePreview.src);
    if (finalVideoPreview.src) URL.revokeObjectURL(finalVideoPreview.src);
    finalMediaBlob = null;
    finalMediaExt = null;
    resultSection.classList.add('hidden');
    resultSection.classList.remove('flex');
    editorSection.classList.remove('hidden');
    const box = document.getElementById('cssVideoPreviewBox');
    if (box) box.innerHTML = '';
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
        if (mediaType === 'video') {
            uploadProgressContainer.classList.remove('hidden');
            uploadProgressContainer.innerHTML = '<div class="flex flex-col items-center w-full"><span class="text-sm font-bold text-navy mb-2" id="progressText2">Menyiapkan Video HD...</span><div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden"><div id="progressBar2" class="bg-gold h-2 rounded-full" style="width: 0%"></div></div></div>';
            
            document.getElementById('progressContainer').classList.remove('hidden');
            
            const cloneVid = document.querySelector('#cssVideoPreviewBox video');
            if (cloneVid) cloneVid.pause();

            finalMediaBlob = await renderBlob();
            
            document.getElementById('progressContainer').classList.add('hidden');
            uploadProgressContainer.innerHTML = '<svg class="w-5 h-5 animate-spin text-gold" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span class="text-sm text-slate-600 font-medium">Mengunggah ke Galeri...</span>';
        } else {
            uploadProgressContainer.classList.remove('hidden');
        }

        const objectUrl = URL.createObjectURL(finalMediaBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = objectUrl;
        a.download = `Twibbon_OSI_HIMASI_${Date.now()}.${finalMediaExt}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);

        let uploadBlob = finalMediaBlob;
        const isPhoto = (finalMediaExt === 'jpg' || finalMediaExt === 'png');
        if (isPhoto) {
            try { uploadBlob = await createLowResImageBlob(finalMediaBlob, 480); }
            catch (err) { uploadBlob = finalMediaBlob; }
        }

        const formData = new FormData();
        formData.append('file', uploadBlob, `twibbon.${finalMediaExt}`);
        formData.append('upload_preset', UPLOAD_PRESET);
        
        const endpoint = isPhoto ? 'image/upload' : 'video/upload';
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}`, {
            method: 'POST', body: formData
        });
        const cloudData = await res.json();
        
        if (res.ok && cloudData.secure_url) {
            await addDoc(collection(db, "gallery"), {
                url: cloudData.secure_url,
                participantName: nameValue,
                type: isPhoto ? 'image' : 'video',
                createdAt: new Date()
            });
            initApp();
            
            uploadProgressContainer.classList.add('hidden');
            document.getElementById('resultActions').classList.add('hidden');
            document.getElementById('successStateContainer')?.classList.remove('hidden');
            document.getElementById('successStateContainer')?.classList.add('flex');
        } else {
            throw new Error(cloudData.error ? cloudData.error.message : "Gagal upload Cloudinary");
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
                    URL.revokeObjectURL(img.src);
                    if (blob) resolve(blob); else reject(new Error('Gagal kompres'));
                }, 'image/jpeg', 0.70);
            } catch (err) { reject(err); }
        };
        img.onerror = () => reject(new Error('Gagal muat gambar'));
        img.src = URL.createObjectURL(fullResBlob);
    });
}

function resetUI() {
    processBtn.disabled = false;
    processBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    uploadLabel.classList.remove('disabled-label');
    fileInput.disabled = false;
    progressContainer.classList.add('hidden');
}
