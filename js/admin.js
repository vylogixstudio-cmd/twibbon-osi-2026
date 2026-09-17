// ========================================
// Twibbon Admin Panel - Application Logic
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, deleteDoc, setDoc, getDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

// Cloudinary Configuration
const CLOUD_NAME = 'n9qafiew';
const UPLOAD_PRESET = 'h5j0pysw';

// ========================================
// DOM Elements
// ========================================
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const logoutBtn = document.getElementById('logoutBtn');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

const templateUpload = document.getElementById('templateUpload');
const saveTemplateBtn = document.getElementById('saveTemplateBtn');
const currentTemplatePreview = document.getElementById('currentTemplatePreview');
const templateStatus = document.getElementById('templateStatus');

const adminGalleryGrid = document.getElementById('adminGalleryGrid');
const galleryCount = document.getElementById('galleryCount');

// ========================================
// Authentication State
// ========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        dashboardSection.classList.add('grid');
        logoutBtn.classList.remove('hidden');
        
        // Load Admin Data
        loadCurrentTemplate();
        loadGallery();
    } else {
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        dashboardSection.classList.remove('grid');
        logoutBtn.classList.add('hidden');
    }
});

// ========================================
// Login Logic
// ========================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    const btn = document.getElementById('loginBtn');
    
    try {
        btn.innerText = "Loading...";
        btn.disabled = true;
        loginError.classList.add('hidden');
        
        await signInWithEmailAndPassword(auth, email, password);
        
    } catch (error) {
        loginError.innerText = "Login gagal: Email atau Password salah.";
        loginError.classList.remove('hidden');
    } finally {
        btn.innerText = "Login";
        btn.disabled = false;
    }
});

// ========================================
// Logout Logic
// ========================================
logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// ========================================
// Template & Asset Management
// ========================================
async function loadCurrentTemplate() {
    try {
        const docRef = doc(db, "settings", "twibbon");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.twibbonPhotoUrl || data.url) currentTemplatePreview.src = data.twibbonPhotoUrl || data.url;
            if (data.twibbonVideoUrl) document.getElementById('currentVideoTemplatePreview').src = data.twibbonVideoUrl;
            if (data.logoLeftUrl) document.getElementById('currentLogoLeft').src = data.logoLeftUrl;
            if (data.logoRightUrl) document.getElementById('currentLogoRight').src = data.logoRightUrl;
            if (data.logoTextUrl) document.getElementById('currentLogoText').src = data.logoTextUrl;
            
            if (data.labelPhoto) document.getElementById('labelPhotoInput').value = data.labelPhoto;
            if (data.labelVideo) document.getElementById('labelVideoInput').value = data.labelVideo;
        }
    } catch (e) {
        console.error("Gagal memuat template:", e);
    }
}

// Preview Lokal Sebelum Upload
function handleLocalPreview(inputId, previewId) {
    document.getElementById(inputId).addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            document.getElementById(previewId).src = url;
        }
    });
}

handleLocalPreview('templateUpload', 'currentTemplatePreview');
handleLocalPreview('templateVideoUpload', 'currentVideoTemplatePreview');
handleLocalPreview('logoLeftUpload', 'currentLogoLeft');
handleLocalPreview('logoRightUpload', 'currentLogoRight');
handleLocalPreview('logoTextUpload', 'currentLogoText');

// ========================================
// Asset Upload Handler
// ========================================
async function handleAssetUpload(fileInputId, btnId, fieldName) {
    const fileInput = document.getElementById(fileInputId);
    const btn = document.getElementById(btnId);
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Pilih file gambar terlebih dahulu!");
        return;
    }

    const originalText = btn.innerText;
    try {
        btn.disabled = true;
        btn.innerText = "Mengupload...";

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        if (data.secure_url) {
            await setDoc(doc(db, "settings", "twibbon"), {
                [fieldName]: data.secure_url,
                updatedAt: new Date()
            }, { merge: true });
            
            alert("Berhasil! Aset telah diperbarui untuk semua orang.");
        } else {
            throw new Error("Gagal mendapatkan URL gambar dari Cloudinary");
        }
    } catch (error) {
        console.error(error);
        alert("Gagal mengunggah aset: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
}

document.getElementById('saveTemplateBtn').addEventListener('click', () => handleAssetUpload('templateUpload', 'saveTemplateBtn', 'twibbonPhotoUrl'));
document.getElementById('saveTemplateVideoBtn').addEventListener('click', () => handleAssetUpload('templateVideoUpload', 'saveTemplateVideoBtn', 'twibbonVideoUrl'));
document.getElementById('saveLogoLeftBtn').addEventListener('click', () => handleAssetUpload('logoLeftUpload', 'saveLogoLeftBtn', 'logoLeftUrl'));
document.getElementById('saveLogoRightBtn').addEventListener('click', () => handleAssetUpload('logoRightUpload', 'saveLogoRightBtn', 'logoRightUrl'));
document.getElementById('saveLogoTextBtn').addEventListener('click', () => handleAssetUpload('logoTextUpload', 'saveLogoTextBtn', 'logoTextUrl'));

// ========================================
// Save Label Text
// ========================================
document.getElementById('saveLabelsBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveLabelsBtn');
    const originalText = btn.innerText;
    const labelPhoto = document.getElementById('labelPhotoInput').value.trim() || 'Untuk Foto';
    const labelVideo = document.getElementById('labelVideoInput').value.trim() || 'Untuk Video';

    try {
        btn.disabled = true;
        btn.innerText = "Menyimpan...";
        
        await setDoc(doc(db, "settings", "twibbon"), {
            labelPhoto: labelPhoto,
            labelVideo: labelVideo,
            updatedAt: new Date()
        }, { merge: true });
        
        alert("Berhasil! Label pilihan template telah diperbarui.");
    } catch (error) {
        console.error(error);
        alert("Gagal menyimpan label: " + error.message);
    } finally {
        btn.disabled = false;
        btn.innerText = originalText;
    }
});

// ========================================
// Gallery Management
// ========================================
async function loadGallery() {
    try {
        adminGalleryGrid.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center py-4">Memuat data galeri...</p>';
        
        const q = query(collection(db, "gallery"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        adminGalleryGrid.innerHTML = '';
        galleryCount.innerText = querySnapshot.size;

        if (querySnapshot.empty) {
            adminGalleryGrid.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center py-4">Belum ada foto di galeri.</p>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const div = document.createElement('div');
            div.className = "relative group bg-gray-100 rounded-lg overflow-hidden border border-gray-200 aspect-square";
            
            let optimizedUrl = data.url;
            let playIcon = '';
            
            if (data.type === 'video') {
                let baseVideoUrl = data.url.split('.').slice(0, -1).join('.');
                optimizedUrl = baseVideoUrl.replace('/upload/', '/upload/w_300,q_auto,f_auto/') + '.jpg';
                playIcon = '<div class="absolute top-2 left-2 bg-black/60 rounded px-2 py-1 text-white text-xs font-bold">🎬 Video</div>';
            } else {
                optimizedUrl = data.url.replace('/upload/', '/upload/w_300,q_auto,f_auto/');
            }

            div.innerHTML = `
                <img src="${optimizedUrl}" class="w-full h-full object-cover" alt="Gallery Image">
                ${playIcon}
                <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                    <span class="block text-white text-xs font-semibold text-center truncate">${data.participantName || 'Anonim'}</span>
                </div>
                <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                    <button class="delete-btn bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1.5 px-3 rounded shadow" data-id="${docSnap.id}">Hapus</button>
                </div>
            `;
            adminGalleryGrid.appendChild(div);
        });

        // Attach delete events
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm("Yakin ingin menghapus foto ini dari Galeri Publik? (Foto tidak akan terhapus dari device pengguna)")) {
                    try {
                        await deleteDoc(doc(db, "gallery", id));
                        e.target.closest('.group').remove();
                        galleryCount.innerText = parseInt(galleryCount.innerText) - 1;
                    } catch (err) {
                        alert("Gagal menghapus foto: " + err.message);
                    }
                }
            });
        });

    } catch (e) {
        console.error("Gagal memuat galeri:", e);
        adminGalleryGrid.innerHTML = '<p class="text-red-500 text-sm col-span-full text-center py-4">Gagal memuat galeri. Pastikan aturan Firebase mengizinkan akses.</p>';
    }
}
