document.addEventListener('DOMContentLoaded', async () => {
    let myChildren = [];
    let myRelationships = [];
    let currentSelectedChildId = localStorage.getItem('selectedChildId');

    const API_CHILDREN = '/WEB_project/backend/api/children.php?action=list';
    const API_RELATIONS = '/WEB_project/backend/api/relations.php';


    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const dashboardChildSelect = document.getElementById('dashboardChildSelect');
    const dashboardChildBirth = document.getElementById('dashboardChildBirth');

    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const container = document.getElementById('relationshipsContainer');
    
    const statTotal = document.getElementById('statTotal');
    const statSiblings = document.getElementById('statSiblings');
    const statCousins = document.getElementById('statCousins');
    const statFriends = document.getElementById('statFriends');

    const modal = document.getElementById('relationModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const addRelationForm = document.getElementById('addRelationForm');
    
    setupTopbar();
    await loadChildren();
    await fetchRelationships();
    
    dashboardChildSelect.addEventListener('change', handleChildSelectionChange);
    searchInput.addEventListener('input', renderPage);
    typeFilter.addEventListener('change', renderPage);
    
    openModalBtn.addEventListener('click', () => {
        if(currentSelectedChildId) document.getElementById('childSelect').value = currentSelectedChildId;
        modal.classList.add('active');
    });
    
    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    addRelationForm.addEventListener('submit', handleAddRelation);

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await window.authManager.logout();
        });
    }

    function setupTopbar() {
        topUserName.textContent = window.authManager.getUserName();
        topUserInitial.textContent = window.authManager.getUserInitial();
        window.authManager.showAdminLinkIfNeeded();
    }

    async function loadChildren() {
        try {
            const result = await window.authManager.get(API_CHILDREN);

            if (result.status === 'success' && result.children.length > 0) {
                myChildren = result.children;
                dashboardChildSelect.innerHTML = '';
                document.getElementById('childSelect').innerHTML = ''; 

                myChildren.forEach((child) => {
                    const age = getAge(child.birth_date);
                    
                    const opt1 = document.createElement('option');
                    opt1.value = child.id;
                    opt1.textContent = `${child.name}, ${age} ani`;
                    dashboardChildSelect.appendChild(opt1);

                    const opt2 = document.createElement('option');
                    opt2.value = child.id;
                    opt2.textContent = child.name;
                    document.getElementById('childSelect').appendChild(opt2);
                });

                if (!currentSelectedChildId || !myChildren.find(c => String(c.id) === String(currentSelectedChildId))) {
                    currentSelectedChildId = myChildren[0].id;
                }
                
                dashboardChildSelect.value = currentSelectedChildId;
                localStorage.setItem('selectedChildId', currentSelectedChildId);
                updateChildBirthText(currentSelectedChildId);

            } else {
                dashboardChildSelect.innerHTML = '<option value="">Niciun copil</option>';
            }
        } catch (err) {
            console.error(err);
        }
    }

    function handleChildSelectionChange() {
        currentSelectedChildId = dashboardChildSelect.value;
        localStorage.setItem('selectedChildId', currentSelectedChildId);
        updateChildBirthText(currentSelectedChildId);
        renderPage(); 
    }

    function updateChildBirthText(childId) {
        const child = myChildren.find(c => String(c.id) === String(childId));
        if (child) {
            dashboardChildBirth.textContent = `Nascut pe ${formatDate(child.birth_date)}`;
        }
    }

    async function fetchRelationships() {
        try {
            const result = await window.authManager.get(API_RELATIONS);
            if (result.status === 'success') {
                myRelationships = result.relationships || [];
                renderPage();
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function handleAddRelation(e) {
        e.preventDefault();

        const data = {
            child_id: document.getElementById('childSelect').value,
            related_name: document.getElementById('relatedPersonName').value,
            relation_type: document.getElementById('relationType').value,
            notes: document.getElementById('relationNotes').value
        };

        try {
            const response = await fetch(API_RELATIONS + '?action=add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${window.authManager.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.status === 'success') {
                addRelationForm.reset();
                modal.classList.remove('active');
                await fetchRelationships();
            } else {
                alert('Eroare: ' + result.message);
            }
        } catch (err) {
            alert("A aparut o problema la server.");
        }
    }

    function renderPage() {
        if(!currentSelectedChildId || myChildren.length === 0) {
            container.innerHTML = `<article class="panel empty-state"><h3>Niciun copil selectat.</h3></article>`;
            return;
        }

        const query = searchInput.value.toLowerCase();
        const filter = typeFilter.value;

        const childRelations = myRelationships.filter(r => String(r.child_id) === String(currentSelectedChildId));

        statTotal.textContent = childRelations.length;
        statSiblings.textContent = childRelations.filter(r => r.relation_type === 'sibling').length;
        statCousins.textContent = childRelations.filter(r => r.relation_type === 'cousin').length;
        statFriends.textContent = childRelations.filter(r => r.relation_type === 'friend' || r.relation_type === 'classmate').length;

        const filteredToDisplay = childRelations.filter(rel => {
            const matchName = rel.related_name.toLowerCase().includes(query);
            const matchType = filter === 'all' || rel.relation_type === filter;
            return matchName && matchType;
        });

        if (filteredToDisplay.length === 0) {
            container.innerHTML = `
                <article class="panel empty-state">
                    <span>👥</span>
                    <h3>Nicio relatie</h3>
                    <p>Acest copil nu are relatii adaugate sau nu corespund filtrului.</p>
                </article>
            `;
            return;
        }

        const currentChild = myChildren.find(c => String(c.id) === String(currentSelectedChildId));

        let html = `
            <article class="panel">
                <div class="child-group-header">
                    <div class="child-avatar-large">👶</div>
                    <div>
                        <h3>Relatiile lui ${escapeHtml(currentChild.name)}</h3>
                    </div>
                </div>
                <div class="relations-grid">
        `;

        filteredToDisplay.forEach(rel => {
            const typeInfo = getRelationLabelAndClass(rel.relation_type);
            const initial = rel.related_name.charAt(0).toUpperCase();
            html += `
                <div class="relation-item">
                    <div class="relation-avatar">${initial}</div>
                    <div class="relation-info">
                        <h4>${escapeHtml(rel.related_name)}</h4>
                        <span class="badge ${typeInfo.class}">${typeInfo.label}</span>
                        ${rel.notes ? `<p class="relation-notes">${escapeHtml(rel.notes)}</p>` : ''}
                    </div>
                </div>
            `;
        });

        html += `</div></article>`;
        container.innerHTML = html;
    }

    function getRelationLabelAndClass(type) {
        switch (type) {
            case 'sibling': return { label: 'Frate/Sora', class: 'sibling' };
            case 'cousin': return { label: 'Var/Verisoara', class: 'cousin' };
            case 'friend': return { label: 'Prieten', class: 'friend' };
            case 'classmate': return { label: 'Coleg', class: 'classmate' };
            default: return { label: type, class: '' };
        }
    }

    function getAge(dateString) {
        if (!dateString) return 0;
        const bDate = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - bDate.getFullYear();
        if (today.getMonth() < bDate.getMonth() || (today.getMonth() === bDate.getMonth() && today.getDate() < bDate.getDate())) age--;
        return Math.max(age, 0);
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function escapeHtml(unsafe) {
        if(!unsafe) return '';
        return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
});