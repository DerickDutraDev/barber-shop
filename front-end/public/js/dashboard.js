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

    // Função para fazer fetch com refresh automático
    async function fetchWithAuth(url, options = {}) {
        let token = getAccessToken();
        if (!options.headers) options.headers = {};
        options.headers['Authorization'] = `Bearer ${token}`;

        let response = await fetch(url, options);

        if (response.status === 401 || response.status === 403) {
            // Tentar refresh token
            const refreshToken = getRefreshToken();
            if (!refreshToken) {
                handleLogout();
                return;
            }

            const refreshResp = await fetch('/api/auth/refresh', {
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

            // Refaz a requisição original com o novo token
            options.headers['Authorization'] = `Bearer ${data.accessToken}`;
            response = await fetch(url, options);
        }

        return response;
    }

    // Função auxiliar para criar cabeçalhos com token
    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken()}`
    });

    // ----------- RESTO DO CÓDIGO EXISTENTE -----------

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

    // Atualiza hora
    function updateTime() {
        const now = new Date();
        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
    }
    updateTime();
    setInterval(updateTime, 1000);

    let currentQueues = { junior: [], yago: [], reine: [] };

    // Renderizar filas
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
                        <li class="list-group-item d-flex justify-content-between align-items-center animate-fade-in">
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

            // Atualiza números da fila
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

    async function handleServeClient(event) {
        const button = event.target.closest('.btn-atender');
        if (!button) return;

        const clientId = button.getAttribute('data-client-id');
        const barberName = button.getAttribute('data-barber');
        if (!clientId || !barberName) return;

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

    if (btnLogout) btnLogout.addEventListener('click', handleLogout);

    fetchQueues();
    setInterval(fetchQueues, 5000);
});
