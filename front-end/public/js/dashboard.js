document.addEventListener('DOMContentLoaded', () => {
    const accessTokenKey = 'barber-access-token';
    const refreshTokenKey = 'barber-refresh-token';

    function getAccessToken() {
        return localStorage.getItem(accessTokenKey);
    }

    function getRefreshToken() {
        return localStorage.getItem(refreshTokenKey);
    }

    function setTokens(accessToken, refreshToken) {
        localStorage.setItem(accessTokenKey, accessToken);
        localStorage.setItem(refreshTokenKey, refreshToken);
    }

    function clearTokens() {
        localStorage.removeItem(accessTokenKey);
        localStorage.removeItem(refreshTokenKey);
    }

    function handleLogout() {
        clearTokens();
        window.location.href = '/barber-login.html';
    }

    async function fetchWithAuth(url, options = {}) {
        let token = getAccessToken();
        if (!options.headers) options.headers = {};
        options.headers['Authorization'] = `Bearer ${token}`;

        let response = await fetch(url, options);

        if (response.status === 401 || response.status === 403) {
            const refreshToken = getRefreshToken();
            if (!refreshToken) {
                handleLogout();
                return;
            }

            const refreshResp = await fetch('http://localhost:3001/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!refreshResp.ok) {
                handleLogout();
                return;
            }

            const data = await refreshResp.json();
            setTokens(data.accessToken, data.refreshToken);

            options.headers['Authorization'] = `Bearer ${data.accessToken}`;
            response = await fetch(url, options);
        }

        return response;
    }

    // ----------- ELEMENTOS -----------
    const barbers = ['Junior', 'Yago', 'Reine'];
    const btnLogout = document.getElementById('btn-logout');
    const addClientForm = document.getElementById('add-client-form');
    const addClientModalElement = document.getElementById('addClientModal');
    const addClientModal = new bootstrap.Modal(addClientModalElement);
    const barberItemsModal = document.querySelectorAll('#barber-selection-modal .barber-item');
    const selectedBarberModalInput = document.getElementById('selected-barber-modal');
    const successModalElement = document.getElementById('successModal');
    const successModal = new bootstrap.Modal(successModalElement);
    const clientNameInput = document.getElementById('client-name');
    const clientNameErrorDiv = document.getElementById('client-name-error');
    const barberModalErrorDiv = document.getElementById('barber-modal-error');
    const timeElement = document.getElementById('current-time');

    // ----------- ATUALIZAÇÃO DO RELÓGIO -----------
    function updateTime() {
        const now = new Date();
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
    }
    updateTime();
    setInterval(updateTime, 1000);

    let currentQueues = { junior: [], yago: [], reine: [] };

    // ----------- RENDER FILAS -----------
    function renderQueues(data) {
        barbers.forEach(barber => {
            const queueList = document.getElementById(`queue-${barber.toLowerCase()}`);
            if (!queueList) return;

            const newQueue = data[barber.toLowerCase()] || [];
            const oldQueue = currentQueues[barber.toLowerCase()] || [];

            const newClientIds = new Set(newQueue.map(c => c.clientId));
            const oldClientIds = new Set(oldQueue.map(c => c.clientId));

            oldQueue.forEach(client => {
                if (!newClientIds.has(client.clientId)) {
                    const listItem = queueList.querySelector(`[data-client-id="${client.clientId}"]`);
                    if (listItem) listItem.closest('li.list-group-item').remove();
                }
            });

            newQueue.forEach((client, index) => {
                if (!oldClientIds.has(client.clientId)) {
                    const newHtml = `
                        <li class="list-group-item d-flex justify-content-between align-items-center animate-fade-in" data-client-id="${client.clientId}">
                            <div class="client-info">
                                <span class="queue-number">${index + 1}.</span>
                                <span>${client.name}</span>
                            </div>
                            <button class="btn btn-sm btn-atender" data-client-id="${client.clientId}" data-barber="${barber}">
                                <i class="fas fa-check me-1"></i> Atender
                            </button>
                        </li>
                    `;
                    queueList.insertAdjacentHTML('beforeend', newHtml);
                }
            });

            const listItems = queueList.querySelectorAll('.list-group-item:not(.empty-queue)');
            if (listItems.length === 0) {
                if (!queueList.querySelector('.empty-queue')) {
                    queueList.classList.add('list-group-empty');
                    queueList.innerHTML = '<li class="list-group-item empty-queue animate-fade-in">Nenhum cliente na fila.</li>';
                }
            } else {
                queueList.classList.remove('list-group-empty');
                if (queueList.querySelector('.empty-queue')) queueList.querySelector('.empty-queue').remove();
                listItems.forEach((item, index) => {
                    const queueNumberSpan = item.querySelector('.queue-number');
                    if (queueNumberSpan) queueNumberSpan.textContent = `${index + 1}.`;
                });
            }

            currentQueues[barber.toLowerCase()] = newQueue;

            document.querySelectorAll('.btn-atender').forEach(button => {
                button.addEventListener('click', handleServeClient);
            });
        });
    }

    // ----------- ATENDER CLIENTE -----------
    async function handleServeClient(event) {
        const button = event.target.closest('.btn-atender');
        if (!button) return;

        const clientId = button.getAttribute('data-client-id');
        if (!clientId) return;

        const listItem = button.closest('li.list-group-item');
        if (listItem) listItem.remove();

        try {
            const response = await fetchWithAuth('http://localhost:3001/api/barber/serve-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId })
            });
            if (!response.ok) console.error('Erro ao atender cliente:', await response.text());
        } catch (error) {
            console.error('Erro de conexão:', error);
        }
    }

    // ----------- BUSCAR FILAS -----------
    async function fetchQueues() {
        try {
            const response = await fetchWithAuth('http://localhost:3001/api/barber/queues', { headers: { 'Content-Type': 'application/json' } });
            if (!response.ok) throw new Error('Erro ao buscar filas');
            const data = await response.json();
            renderQueues(data);
        } catch (error) {
            console.error('Erro:', error);
            renderQueues({ junior: [], yago: [], reine: [] });
        }
    }

    // ----------- SELEÇÃO DO BARBEIRO NO MODAL -----------
    barberItemsModal.forEach(button => {
        button.addEventListener('click', () => {
            barberItemsModal.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            selectedBarberModalInput.value = button.getAttribute('data-barber');
            barberModalErrorDiv.textContent = '';
        });
    });

    // ----------- SUBMIT DO FORMULÁRIO DE ADIÇÃO DE CLIENTE -----------
    if (addClientForm) {
        addClientForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const clientName = clientNameInput.value.trim();
            const barber = selectedBarberModalInput.value;

            clientNameErrorDiv.textContent = '';
            barberModalErrorDiv.textContent = '';

            if (!clientName) {
                clientNameErrorDiv.textContent = 'Digite o nome do cliente';
                return;
            }
            if (!barber) {
                barberModalErrorDiv.textContent = 'Escolha um barbeiro';
                return;
            }

            try {
                    const response = await fetchWithAuth('http://localhost:3001/api/barber/adicionar-cliente-manual', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nome: clientName, barber }) // <-- envia barber, não barbeiro
                    });


                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText);
                }

                addClientModal.hide();
                clientNameInput.value = '';
                selectedBarberModalInput.value = '';
                barberItemsModal.forEach(btn => btn.classList.remove('active'));

                // Mostrar modal de sucesso e auto-hide
                successModal.show();
                setTimeout(() => {
                    successModal.hide();
                }, 1000); // 780 segundos = 13 minutos

                fetchQueues();
            } catch (error) {
                console.error('Erro ao adicionar cliente:', error);
            }
        });
    }

    // ----------- LOGOUT -----------
    if (btnLogout) btnLogout.addEventListener('click', handleLogout);

    // ----------- LOOP DAS FILAS -----------
    fetchQueues();
    setInterval(fetchQueues, 5000);
});
