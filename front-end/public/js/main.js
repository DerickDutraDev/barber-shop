document.addEventListener('DOMContentLoaded', () => {
    const clienteForm = document.getElementById('cliente-form');
    const nomeClienteInput = document.getElementById('nome-cliente');
    const nomeErrorDiv = document.getElementById('nome-error');
    const barbeiroErrorDiv = document.getElementById('barber-error');
    const clienteFormSection = document.getElementById('cliente-form-section');
    const queueResponseSection = document.getElementById('queue-response');
    const joinQueueBtn = document.getElementById('join-queue-btn');
    const btnSairFila = document.getElementById('btn-sair-fila');
    const barberItems = document.querySelectorAll('.barber-item');
    const selectedBarberInput = document.getElementById('selected-barber');
    const clientNameDisplay = document.getElementById('client-name-display');
    const barberNameDisplay = document.getElementById('barber-name-display');
    const queuePositionDisplay = document.getElementById('queue-position-display');

    let currentClientId = null;
    let queueCheckInterval = null;

    const barbers = {
        junior: 'Barbeiro Junior',
        yago: 'Barbeiro Yago',
        reine: 'Barbeiro Reine'
    };

    function toggleSections(showQueueResponse = false) {
        if (showQueueResponse) {
            clienteFormSection.style.display = 'none';
            queueResponseSection.style.display = 'block';
        } else {
            clienteFormSection.style.display = 'block';
            queueResponseSection.style.display = 'none';
        }
    }

    barberItems.forEach(item => {
        item.addEventListener('click', () => {
            barberItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedBarberInput.value = item.getAttribute('data-barber');
            // Remove a mensagem de erro do barbeiro ao selecionar um
            barbeiroErrorDiv.textContent = '';
        });
    });

    clienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = nomeClienteInput.value.trim();
        const barbeiroId = selectedBarberInput.value;

        // Validação personalizada
        let isValid = true;
        if (!nome) {
            nomeClienteInput.classList.add('is-invalid');
            nomeErrorDiv.textContent = 'Por favor, digite seu nome.';
            isValid = false;
        } else {
            nomeClienteInput.classList.remove('is-invalid');
            nomeErrorDiv.textContent = '';
        }

        if (!barbeiroId) {
            barbeiroErrorDiv.textContent = 'Por favor, selecione um barbeiro.';
            isValid = false;
        } else {
            barbeiroErrorDiv.textContent = '';
        }

        if (!isValid) {
            return;
        }

        joinQueueBtn.disabled = true;
        joinQueueBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Entrando na fila...';

        try {
            const response = await fetch('http://localhost:3001/api/join-queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: nome, barber: barbeiroId.toLowerCase() })
            });
            
            // Tratamento de erro mais robusto para respostas que não são JSON
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            currentClientId = data.clientId;
            const queuePosition = data.position;
            const barbeiroNome = barbers[barbeiroId.toLowerCase()];
            
            document.getElementById('modal-queue-info').innerHTML = `Você é o número <b>${queuePosition}</b> da fila para cortar com o <b>${barbeiroNome}</b>.`;
            const queueModal = new bootstrap.Modal(document.getElementById('queueModal'));
            queueModal.show();

            clientNameDisplay.textContent = nome;
            barberNameDisplay.textContent = barbeiroNome;
            queuePositionDisplay.textContent = queuePosition;

            toggleSections(true);

            startQueueCheck();

        } catch (error) {
            console.error('Erro na comunicação com o servidor:', error);
            alert(`Erro ao entrar na fila: ${error.message || 'Erro desconhecido'}`);
        } finally {
            joinQueueBtn.disabled = false;
            joinQueueBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Entrar na Fila';
        }
    });

    btnSairFila.addEventListener('click', async () => {
        if (!currentClientId) return;

        btnSairFila.disabled = true;
        btnSairFila.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saindo...';

        try {
            const response = await fetch('http://localhost:3001/api/leave-queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: currentClientId })
            });

            if (response.ok) {
                stopQueueCheck();
                currentClientId = null;
                toggleSections(false);
            } else {
                const errorData = await response.json();
                alert(`Erro: ${errorData.error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Erro ao sair da fila:', error);
            alert('Erro de conexão com o servidor.');
        } finally {
            btnSairFila.disabled = false;
            btnSairFila.innerHTML = '<i class="fas fa-door-open me-2"></i> Sair da Fila';
        }
    });

    async function checkMyPosition() {
        if (!currentClientId) {
            stopQueueCheck();
            return;
        }

        try {
            const response = await fetch('http://localhost:3001/api/queues');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const queues = await response.json();
            
            let myPosition = null;
            let myBarber = null;

            for (const barber in queues) {
                const position = queues[barber].findIndex(client => client.clientId === currentClientId);
                if (position !== -1) {
                    myPosition = position + 1;
                    myBarber = barber;
                    break;
                }
            }
            
            if (myPosition !== null) {
                queuePositionDisplay.textContent = myPosition;
                barberNameDisplay.textContent = barbers[myBarber];
                document.getElementById('queue-message').textContent = 'Você já está na fila. Por favor, aguarde seu atendimento.';
            } else {
                stopQueueCheck();
                toggleSections(false);
            }

        } catch (error) {
            console.error('Erro ao verificar a fila:', error);
        }
    }

    function startQueueCheck() {
        if (queueCheckInterval) clearInterval(queueCheckInterval);
        queueCheckInterval = setInterval(checkMyPosition, 5000);
    }

    function stopQueueCheck() {
        if (queueCheckInterval) {
            clearInterval(queueCheckInterval);
            queueCheckInterval = null;
        }
    }
});