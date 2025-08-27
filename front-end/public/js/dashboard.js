document.addEventListener('DOMContentLoaded', () => {
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
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }
    updateTime();
    setInterval(updateTime, 1000);

    let currentQueues = { junior: [], yago: [], reine: [] };

    function renderQueues(data) {
        barbers.forEach(barber => {
            const queueList = document.getElementById(`queue-${barber.toLowerCase()}`);
            if (!queueList) return;

            const newQueue = data[barber.toLowerCase()] || [];
            const oldQueue = currentQueues[barber.toLowerCase()];

            const newClientIds = new Set(newQueue.map(c => c.clientId));
            const oldClientIds = new Set(oldQueue.map(c => c.clientId));

            oldQueue.forEach(client => {
                if (!newClientIds.has(client.clientId)) {
                    const listItem = queueList.querySelector(`[data-client-id="${client.clientId}"]`);
                    if (listItem) {
                        listItem.closest('li.list-group-item').remove();
                    }
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

            const listItems = queueList.querySelectorAll('.list-group-item:not(.empty-queue)');
            if (listItems.length === 0) {
                if (!queueList.querySelector('.empty-queue')) {
                    queueList.classList.add('list-group-empty');
                    queueList.innerHTML = '<li class="list-group-item empty-queue animate-fade-in">Nenhum cliente na fila.</li>';
                }
            } else {
                queueList.classList.remove('list-group-empty');
                if (queueList.querySelector('.empty-queue')) {
                    queueList.querySelector('.empty-queue').remove();
                }
                listItems.forEach((item, index) => {
                    const queueNumberSpan = item.querySelector('.queue-number');
                    if (queueNumberSpan) {
                        queueNumberSpan.textContent = `${index + 1}.`;
                    }
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
        if (!clientId || !barberName) {
            console.error('ID do cliente ou nome do barbeiro não encontrados para atender.');
            return;
        }

        const listItem = button.closest('li.list-group-item');
        if (listItem) {
            listItem.remove();
            updateQueueNumbers(barberName);
        }
        
        try {
            await fetch('http://localhost:3001/api/serve-client', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: clientId })
            });
            console.log('Cliente atendido com sucesso no backend!');
        } catch (error) {
            console.error('Erro de conexão com o servidor:', error);
        }
    }

    function updateQueueNumbers(barber) {
        const queueList = document.getElementById(`queue-${barber.toLowerCase()}`);
        if (!queueList) return;

        const listItems = queueList.querySelectorAll('.list-group-item:not(.empty-queue)');
        
        if (listItems.length === 0) {
            queueList.classList.add('list-group-empty');
            queueList.innerHTML = '<li class="list-group-item empty-queue animate-fade-in">Nenhum cliente na fila.</li>';
        } else {
            queueList.classList.remove('list-group-empty');
            if (queueList.querySelector('.empty-queue')) {
                queueList.querySelector('.empty-queue').remove();
            }
            listItems.forEach((item, index) => {
                const queueNumberSpan = item.querySelector('.queue-number');
                if (queueNumberSpan) {
                    queueNumberSpan.textContent = `${index + 1}.`;
                }
            });
        }
    }

    function handleLogout() {
        localStorage.removeItem('barber-token');
        window.location.href = 'index.html';
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }
    
    barberItemsModal.forEach(item => {
        item.addEventListener('click', () => {
            barberItemsModal.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedBarberModalInput.value = item.getAttribute('data-barber');
            barberModalErrorDiv.textContent = '';
        });
    });

    if (addClientForm) {
        addClientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const clientName = clientNameInput.value.trim();
            const barber = selectedBarberModalInput.value;

            let isValid = true;
            if (!clientName) {
                clientNameInput.classList.add('is-invalid');
                clientNameErrorDiv.textContent = 'Por favor, digite o nome do cliente.';
                isValid = false;
            } else {
                clientNameInput.classList.remove('is-invalid');
                clientNameErrorDiv.textContent = '';
            }

            if (!barber) {
                barberModalErrorDiv.textContent = 'Por favor, selecione um barbeiro.';
                isValid = false;
            } else {
                barberModalErrorDiv.textContent = '';
            }

            if (!isValid) {
                return;
            }

            const submitButton = addClientForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Adicionando...';

            try {
                const response = await fetch('http://localhost:3001/api/adicionar-cliente-manual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nome: clientName, barbeiro: barber })
                });

                if (response.ok) {
                    addClientModal.hide();
                    successModal.show();
                    // Define um temporizador para fechar o modal após 3 segundos
                    setTimeout(() => {
                        successModal.hide();
                    }, 980);
                    
                    addClientForm.reset();
                    clientNameInput.classList.remove('is-invalid');
                    clientNameErrorDiv.textContent = '';
                    fetchQueues();
                } else {
                    const errorData = await response.json();
                    alert('Erro ao adicionar cliente: ' + errorData.error);
                }
            } catch (error) {
                console.error('Erro ao adicionar cliente:', error);
                alert('Erro de conexão com o servidor.');
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Adicionar na Fila';
            }
        });
    }

    async function fetchQueues() {
        try {
            const response = await fetch('http://localhost:3001/api/queues');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderQueues(data);
        } catch (error) {
            console.error('Erro de conexão ou ao buscar as filas:', error);
            renderQueues({ junior: [], yago: [], reine: [] });
        }
    }
    
    fetchQueues();
    setInterval(fetchQueues, 5000);
});