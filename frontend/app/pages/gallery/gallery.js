if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
} else {
    initGallery();
}

async function initGallery() {
    const AUTH_TOKEN_KEY = 'bain_auth_token';
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
    let showingFavorites = false;

    const API_CHILDREN = '/WEB_project/backend/api/children.php';
    const API_GALLERY = '/WEB_project/backend/api/gallery.php';

    function getAuthToken() {
        return sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
    }

    function redirectToLogin() {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('selectedChildId');
        window.location.href = '../auth/login.html';
    }

    function getAuthHeaders(extraHeaders = {}) {
        return {
            ...extraHeaders,
            Authorization: `Bearer ${getAuthToken()}`
        };
    }

    async function requestJson(url, options = {}) {
        if (!getAuthToken()) {
            redirectToLogin();
            return { status: 'error', message: 'Token lipsa.' };
        }

        const response = await fetch(url, {
            ...options,
            headers: getAuthHeaders(options.headers || {})
        });

        const text = await response.text();
        let result;

        try {
            result = JSON.parse(text);
        } catch (error) {
            console.error(text);
            return { status: 'error', message: 'Raspuns invalid de la server.' };
        }

        if (response.status === 401) {
            redirectToLogin();
            return result;
        }

        return result;
    }

    async function apiRequest(url, method = 'GET', data = null) {
        const options = {
            method: method
        };

        if (data) {
            options.headers = {
                'Content-Type': 'application/json'
            };
            options.body = JSON.stringify(data);
        }

        return await requestJson(url, options);
    }
    async function loadUserData() {
    const result = await apiRequest('/WEB_project/backend/api/account.php?action=get');
    
    if (result.status === 'success' && result.user) {
        const user = result.user;
        const profile = result.profile || {};
        
        // Setează numele
        if (topUserName) topUserName.textContent = user.name || 'User';
        
        // Setează initiala pe SPAN, nu pe div
        const initialSpan = document.getElementById('topUserInitialText');
        if (initialSpan) initialSpan.textContent = (user.name || 'U').charAt(0).toUpperCase();
        
        // Aplică poza
        const photoUrl = profile.photo || null;
        const avatarDiv = document.getElementById('topUserInitial');
        
        if (avatarDiv && photoUrl) {
            avatarDiv.classList.add('has-photo');
            avatarDiv.style.backgroundImage = `url("${photoUrl}")`;
            avatarDiv.style.backgroundSize = 'cover';
            avatarDiv.style.backgroundPosition = 'center';
            const initialSpan = document.getElementById('topUserInitialText');
    if (initialSpan) initialSpan.style.display = 'none';
        }
    }
}

    async function loadChildren() {
        const result = await apiRequest(`${API_CHILDREN}?action=list`);

        if (result.status !== 'success' || !result.children?.length) {
            galleryChildSelect.innerHTML = '<option>Niciun copil adăugat</option>';
            galleryChildAge.textContent = 'Adaugă un copil';
            mediaGrid.innerHTML = '<p class="loading-text">Nu ai copii adăugați.</p>';
            return;
        }

        allChildrenData = result.children;
        galleryChildSelect.innerHTML = '';

        const savedId = localStorage.getItem('selectedChildId');
        let selectedChild = result.children.find(c => String(c.id) === String(savedId)) || result.children[0];

        result.children.forEach(child => {
            const option = document.createElement('option');
            option.value = child.id;
            option.textContent = child.name;
            galleryChildSelect.appendChild(option);
        });

        galleryChildSelect.value = selectedChild.id;
        localStorage.setItem('selectedChildId', selectedChild.id);

        updateAgeDisplay(selectedChild.id);
        await loadGalleryData(selectedChild.id);

        galleryChildSelect.addEventListener('change', (e) => {
            const childId = e.target.value;
            const child = result.children.find(c => String(c.id) === String(childId));
            if (child) {
                localStorage.setItem('selectedChildId', childId);
                updateAgeDisplay(childId);
                loadGalleryData(childId);
            }
        });
    }

    function updateAgeDisplay(childId) {
        const child = allChildrenData.find(c => String(c.id) === String(childId));
        if (child && child.birth_date) {
            galleryChildAge.textContent = calculateAgeString(child.birth_date);
        } else {
            galleryChildAge.textContent = 'Vârstă necunoscută';
        }
    }

    function calculateAgeString(dateString) {
        if (!dateString) return '';
        const parts = dateString.split('-');
        const birthDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();

        if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
            years--;
            months += 12;
        }
        if (today.getDate() < birthDate.getDate()) {
            months--;
            if (months < 0) months = 11;
        }

        let result = [];
        if (years > 0) result.push(`${years} ${years === 1 ? 'an' : 'ani'}`);
        if (months > 0) result.push(`${months} ${months === 1 ? 'lună' : 'luni'}`);
        
        return result.length === 0 ? 'Nou-născut' : result.join(', ');
    }

    async function loadGalleryData(childId) {
        mediaGrid.innerHTML = '<p class="loading-text">Se încarcă...</p>';
        
        const result = await apiRequest(`${API_GALLERY}?action=get_all&child_id=${childId}`);

        if (result.status === 'success') {
            currentMediaData = result.media || [];
            applyFilters();
        } else {
            mediaGrid.innerHTML = `<p>${result.message || 'Fără elemente media.'}</p>`;
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
                const imgUrl = escapeHtml(item.file_url);
                mediaHtml = `<img src="${imgUrl}" alt="media" class="media-img" onerror="this.style.display='none'">`;
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

    function applyFilters() {
        const activeTab = document.querySelector('#filterTabs button.active');
        const type = activeTab ? activeTab.getAttribute('data-type') : 'all';
        
        let filteredData = currentMediaData;

        if (type !== 'all') {
            filteredData = filteredData.filter(item => item.type === type);
        }

        if (showingFavorites) {
            filteredData = filteredData.filter(item => 
                localStorage.getItem(`fav_${item.id}`) === 'true'
            );
        }

        renderMediaGrid(filteredData);
    }

    if (uploadBtn && hiddenFileInput) {
        uploadBtn.addEventListener('click', () => hiddenFileInput.click());

        hiddenFileInput.addEventListener('change', async (e) => {
            const files = e.target.files;
            if (files.length === 0) return;

            const selectedChildId = localStorage.getItem('selectedChildId');
            if (!selectedChildId) {
                alert('Te rugam sa selectezi un copil mai intai.');
                return;
            }

            const formData = new FormData();
            formData.append('child_id', selectedChildId);
            for (let i = 0; i < files.length; i++) {
                formData.append('files[]', files[i]);
            }

            try {
                uploadBtn.textContent = 'Se încarcă...';
                uploadBtn.disabled = true;

                const response = await fetch(API_GALLERY, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    },
                    body: formData
                });

                const result = await response.json();

                if (result.status === 'success') {
                    await loadGalleryData(selectedChildId);
                } else {
                    alert('Eroare la incarcare: ' + result.message);
                }
            } catch (error) {
                console.error('Upload error:', error);
                alert('Nu s-a putut conecta la server pentru upload.');
            } finally {
                uploadBtn.textContent = '↑ Încarcă fișier';
                uploadBtn.disabled = false;
                hiddenFileInput.value = '';
            }
        });
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

    const favFilterBtn = document.getElementById('favFilterBtn');
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

    if (mediaGrid) {
        mediaGrid.addEventListener('click', async (e) => {
            const deleteButton = e.target.closest('.media-delete');
            if (deleteButton) {
                e.preventDefault();
                e.stopPropagation();

                if (confirm('Ești sigur că vrei să ștergi acest fișier? Acțiunea este ireversibilă.')) {
                    const mediaId = deleteButton.getAttribute('data-id');
                    
                    try {
                        deleteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                        
                        const response = await fetch(API_GALLERY, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${getAuthToken()}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                action: 'delete_media',
                                media_id: mediaId
                            })
                        });
                        
                        const result = await response.json();
                        
                        if (result.status === 'success') {
                            await loadGalleryData(localStorage.getItem('selectedChildId'));
                        } else {
                            alert('Eroare ștergere: ' + (result.message || 'Necunoscut'));
                            deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
                        }
                    } catch (error) {
                        console.error('Delete error:', error);
                        alert('Eroare de conexiune: ' + error.message);
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
        if (!value) return '';
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
    logoutBtn.addEventListener('click', async () => {
        await requestJson('/WEB_project/backend/api/logout.php', {
            method: 'POST'
        });
        redirectToLogin();
    });
     await loadUserData()
    await loadChildren();
}