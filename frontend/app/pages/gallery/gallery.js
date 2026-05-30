document.addEventListener('DOMContentLoaded', async () => {
    console.log("1. Pagina s-a incarcat. Incepem initializarea...");

    const uploadBtn = document.getElementById('uploadBtn');
    const hiddenFileInput = document.getElementById('hiddenFileInput');
    const filterTabs = document.querySelectorAll('#filterTabs button');
    
    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const galleryChildSelect = document.getElementById('galleryChildSelect');
    const galleryChildAge = document.getElementById('galleryChildAge');
    const mediaGrid = document.getElementById('mediaGrid');

    let currentMediaData = [];
    let allChildrenData = [];
    let selectedChildId = localStorage.getItem('selectedChildId');

    const apiAuth = '/WEB_project/backend/api/check_session.php';
    const apiChildren = '/WEB_project/backend/api/children.php';
    const apiGallery = '/WEB_project/backend/api/gallery.php'; 

    if (uploadBtn && hiddenFileInput) {
        uploadBtn.addEventListener('click', () => hiddenFileInput.click());

        hiddenFileInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (files.length === 0) return;

            if (!selectedChildId) {
                alert("Te rugam sa selectezi un copil mai intai.");
                return;
            }

            const formData = new FormData();
            formData.append('child_id', selectedChildId);
            for (let i = 0; i < files.length; i++) {
                formData.append('files[]', files[i]);
            }

            try {
                uploadBtn.textContent = "Se încarcă...";
                uploadBtn.disabled = true;

                const response = await fetch(apiGallery, { method: 'POST', body: formData });
                const result = await response.json();

                if (result.status === 'success') {
                    loadGalleryData(selectedChildId); 
                } else {
                    alert("Eroare la incarcare: " + result.message);
                }
            } catch (error) {
                console.error("Eroare retea la upload:", error);
                alert("Nu s-a putut conecta la server pentru upload.");
            } finally {
                uploadBtn.textContent = "↑ Încarcă fișier";
                uploadBtn.disabled = false;
                hiddenFileInput.value = ''; 
            }
        });
    }

    const favFilterBtn = document.getElementById('favFilterBtn');
    let showingFavorites = false;

    function applyFilters() {
        const activeTab = document.querySelector('#filterTabs button.active');
        const type = activeTab ? activeTab.getAttribute('data-type') : 'all';
        
        let filteredData = currentMediaData;

        if (type !== 'all') {
            filteredData = filteredData.filter(item => item.type === type);
        }

        if (showingFavorites) {
            filteredData = filteredData.filter(item => {
                return localStorage.getItem(`fav_${item.id}`) === 'true';
            });
        }

        renderMediaGrid(filteredData);
    }

    if (filterTabs.length > 0) {
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                applyFilters();
            });
        });
    }

    if (favFilterBtn) {
        favFilterBtn.addEventListener('click', () => {
            showingFavorites = !showingFavorites;
            if (showingFavorites) {
                favFilterBtn.classList.add('active');
                favFilterBtn.innerHTML = '<i class="fas fa-heart"></i> Favorite';
                favFilterBtn.style.color = '#ff6b6b';
            } else {
                favFilterBtn.classList.remove('active');
                favFilterBtn.innerHTML = '<i class="far fa-heart"></i> Favorite';
                favFilterBtn.style.color = '';
            }
            applyFilters();
        });
    }
    async function checkSession() {
        try {
            const response = await fetch(apiAuth, { method: 'GET', credentials: 'same-origin' });
            const result = await response.json();
            if (result.status !== 'success') {
                window.location.href = '../auth/login.html';
                return false;
            }
            topUserName.textContent = result.user.name || 'User';
            topUserInitial.textContent = (result.user.name || 'U').charAt(0).toUpperCase();
            return true;
        } catch (error) {
            window.location.href = '../auth/login.html';
            return false;
        }
    }

    async function loadGalleryChildren() {
        try {
            const response = await fetch(`${apiChildren}?action=list`, { method: 'GET', credentials: 'same-origin' });
            const result = await response.json();
            
            if (result.status === 'success' && result.children.length > 0) {
                allChildrenData = result.children;
                galleryChildSelect.innerHTML = '';
                let hasSelected = false;

                result.children.forEach(child => {
                    const option = document.createElement('option');
                    option.value = child.id;
                    option.textContent = child.name; 
                    galleryChildSelect.appendChild(option);

                    if (String(child.id) === String(selectedChildId)) {
                        option.selected = true;
                        hasSelected = true;
                    }
                });

                if (!hasSelected) {
                    selectedChildId = result.children[0].id;
                    galleryChildSelect.value = selectedChildId;
                    localStorage.setItem('selectedChildId', selectedChildId);
                }

                updateAgeDisplay(selectedChildId);
                loadGalleryData(selectedChildId);

                galleryChildSelect.addEventListener('change', (e) => {
                    selectedChildId = e.target.value;
                    localStorage.setItem('selectedChildId', selectedChildId);
                    updateAgeDisplay(selectedChildId); 
                    loadGalleryData(selectedChildId);  
                });

            } else {
                galleryChildSelect.innerHTML = '<option>Niciun copil adăugat</option>';
                galleryChildAge.textContent = 'Adaugă un copil';
                mediaGrid.innerHTML = '<p class="loading-text">Nu ai copii adăugați.</p>';
            }
        } catch (error) {
            console.error("Eroare incarcare copii:", error);
        }
    }

    function updateAgeDisplay(childId) {
        const child = allChildrenData.find(c => String(c.id) === String(childId));
        if (child && child.birth_date) {
            galleryChildAge.textContent = calculateAgeString(child.birth_date);
        } else {
            galleryChildAge.textContent = "Vârstă necunoscută";
        }
    }

    function calculateAgeString(dateString) {
        if (!dateString) return '';
        const parts = dateString.split('-');
        const birthDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) { years--; months += 12; }
        if (today.getDate() < birthDate.getDate()) { months--; if (months < 0) months = 11; }

        let result = [];
        if (years > 0) result.push(`${years} ${years === 1 ? 'an' : 'ani'}`);
        if (months > 0) result.push(`${months} ${months === 1 ? 'lună' : 'luni'}`);
        return result.length === 0 ? 'Nou-născut' : result.join(', ');
    }

    async function loadGalleryData(childId) {
        mediaGrid.innerHTML = '<p class="loading-text">Se încarcă...</p>';

        try {
            const response = await fetch(`${apiGallery}?action=get_all&child_id=${childId}`, { method: 'GET', credentials: 'same-origin' });
            
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const result = await response.json();

                if (result.status === 'success') {
                    currentMediaData = result.media || [];
                    applyFilters(); 
                } else {
                    mediaGrid.innerHTML = `<p>${result.message || 'Fara elemente media.'}</p>`;
                }
            } else {
                const textError = await response.text();
                mediaGrid.innerHTML = `<p style="color:red; font-size:12px; overflow-wrap: break-word;">${textError}</p>`;
            }
        } catch (error) {
            mediaGrid.innerHTML = '<p style="color:red">Eroare de retea.</p>';
        }
    }

    function renderMediaGrid(mediaArray) {
        mediaGrid.innerHTML = '';
        if (mediaArray.length === 0) {
            mediaGrid.innerHTML = '<p class="loading-text">Niciun fișier găsit în această categorie.</p>';
            return;
        }

        mediaArray.forEach(item => {
            const card = document.createElement('div');
            card.className = 'media-card';
            
            const isFavorite = localStorage.getItem(`fav_${item.id}`) === 'true';

            let mediaHtml = '';
            if (item.type === 'video') {
                mediaHtml = `<video src="${escapeHtml(item.file_url)}" controls style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px;"></video>`;
            } else {
                mediaHtml = `<img src="${escapeHtml(item.file_url)}" alt="media" onerror="this.src='https://via.placeholder.com/200?text=Eroare+Poza'">`;
            }

            card.innerHTML = `
                ${mediaHtml}
                <div class="media-badge">${formatDate(item.capture_date)}</div>
                
                <button class="media-delete" data-id="${item.id}" style="border: none; background: rgba(255, 255, 255, 0.9); width: 30px; height: 30px; border-radius: 50%; position: absolute; top: 12px; right: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 5; color: #ff4d4d;">
                    <i class="fas fa-trash"></i>
                </button>

                <button class="media-fav" data-id="${item.id}" style="border: none; background: white; width: 30px; height: 30px; border-radius: 50%; position: absolute; bottom: 12px; right: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 5;">
                    <i class="${isFavorite ? 'fas' : 'far'} fa-heart" style="color: #ff6b6b; font-size: 0.95rem;"></i>
                </button>
            `;
            mediaGrid.appendChild(card);
        });
    }

    if (mediaGrid) {
        mediaGrid.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.media-delete');
            if (deleteButton) {
                e.preventDefault();
                e.stopPropagation();

                if (confirm("Ești sigur că vrei să ștergi acest fișier? Acțiunea este ireversibilă.")) {
                    const mediaId = deleteButton.getAttribute('data-id');
                    
                    const formData = new FormData();
                    formData.append('action', 'delete_media');
                    formData.append('media_id', mediaId);

                    try {
                        deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; 
                        const response = await fetch(apiGallery, { method: 'POST', body: formData });
                        const result = await response.json();
                        
                        if (result.status === 'success') {
                            loadGalleryData(selectedChildId); 
                        }
                    } catch (error) {
                        alert("Eroare de conexiune la ștergere.");
                        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                    }
                }
                return;
            }

            const favButton = e.target.closest('.media-fav');
            if (favButton) {
                e.preventDefault();
                e.stopPropagation(); 
                
                const mediaId = favButton.getAttribute('data-id');
                const favKey = `fav_${mediaId}`;
                
                const isCurrentlyFav = localStorage.getItem(favKey) === 'true';
                localStorage.setItem(favKey, !isCurrentlyFav);
                
                applyFilters();
            }
        });
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function escapeHtml(value) {
        if(!value) return '';
        return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/WEB_project/backend/api/logout.php', { method: 'POST', credentials: 'same-origin' });
            localStorage.removeItem('selectedChildId');
            window.location.href = '../auth/login.html';
        });
    }

    const isLoggedIn = await checkSession();
    if (isLoggedIn) {
        await loadGalleryChildren(); 
    }
});