document.addEventListener('DOMContentLoaded', () => {
    const barbers = ['Junior', 'Yago', 'Reine'];
    const btnLogout = document.getElementById('btn-logout');
    const addClientForm = document.getElementById('add-client-form');
    const addClientModalElement = document.getElementById('addClientModal');
    const addClientModal = new bootstrap.Modal(addClientModalElement);
    const barberItemsModal = document.querySelectorAll('#barber-selection-modal .barber-item');
    const selectedBarberModalInput = document.getElementById('selected-barber-modal');

    // Função para renderizar as filas no dashboard
    function renderQueues(data) {
        barbers.forEach(barber => {
            const queueList = document.getElementById(`queue-${barber.toLowerCase()}`);
            if (!queueList) return;

            const queue = data[barber] || [];
            
            let newQueueHtml = '';
            if (queue.length === 0) {
                newQueueHtml = '<li class="list-group-item empty-queue animate-fade-in">Nenhum cliente na fila.</li>';
            } else {
                newQueueHtml = queue.map(client => `
                    <li class="list-group-item d-flex justify-content-between align-items-center animate-fade-in">
                        <span>${client.name}</span>
                        <button class="btn btn-sm btn-atender" data-client-id="${client.id}" data-barber="${barber}">
                            Atender
                        </button>
                    </li>
                `).join('');
            }
            queueList.innerHTML = newQueueHtml;
        });
        
        document.querySelectorAll('.btn-atender').forEach(button => {
            button.addEventListener('click', handleServeClient);
        });
    }

    // Função de logout
    function handleLogout() {
        localStorage.removeItem('barber-token');
        window.location.href = 'index.html';
    }

    // Adiciona o evento de clique ao botão de sair
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }
    
    // Lógica para selecionar o barbeiro no modal
    barberItemsModal.forEach(item => {
        item.addEventListener('click', () => {
            barberItemsModal.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedBarberModalInput.value = item.getAttribute('data-barber');
        });
    });

    // Lógica para adicionar cliente manualmente
    if (addClientForm) {
        addClientForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const clientName = document.getElementById('client-name').value;
            const barber = selectedBarberModalInput.value;

            if (!clientName || !barber) {
                alert('Por favor, preencha o nome e selecione um barbeiro.');
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
                    alert('Cliente adicionado à fila com sucesso!');
                    addClientModal.hide();
                    addClientForm.reset();
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
    
    // Rota: POST /serve-client
    async function handleServeClient(event) {
        const clientId = event.target.getAttribute('data-client-id');
        const barberName = event.target.getAttribute('data-barber');
        if (!clientId || !barberName) {
            console.error('ID do cliente ou nome do barbeiro não encontrados para atender.');
            return;
        }

        event.target.textContent = 'Atendendo...';
        event.target.disabled = true;

        try {
            const response = await fetch('http://localhost:3001/api/atender-cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clienteId: clientId, barbeiro: barberName })
            });

            if (response.ok) {
                console.log('Cliente atendido com sucesso!');
            } else {
                const errorData = await response.json();
                alert('Erro ao atender cliente: ' + errorData.error);
            }
        } catch (error) {
            console.error('Erro ao atender cliente:', error);
            alert('Erro de conexão com o servidor.');
        } finally {
            fetchQueues();
        }
    }

    // Rota: GET /queues
    async function fetchQueues() {
        try {
            const response = await fetch('http://localhost:3001/api/obter-fila-completa');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            renderQueues(data);
        } catch (error) {
            console.error('Erro de conexão ou ao buscar as filas:', error);
        }
    }
    
    fetchQueues();
    setInterval(fetchQueues, 5000);
});