document.addEventListener('DOMContentLoaded', () => {
    const clienteForm = document.getElementById('cliente-form');
    const clienteFormSection = document.getElementById('cliente-form-section');
    const queueResponseSection = document.getElementById('queue-response');
    const joinQueueBtn = document.getElementById('join-queue-btn');
    const btnSairFila = document.getElementById('btn-sair-fila');
    const barberItems = document.querySelectorAll('.barber-item');
    const selectedBarberInput = document.getElementById('selected-barber');
    const queueMessage = document.getElementById('queue-message');
    const clientNameDisplay = document.getElementById('client-name-display');
    const barberNameDisplay = document.getElementById('barber-name-display');
    const queuePositionDisplay = document.getElementById('queue-position-display');

    let currentClientId = null;
    
    const barbers = {
        junior: 'Barbeiro Junior',
        yago: 'Barbeiro Yago',
        reine: 'Barbeiro Reine'
    };

    // Função para alternar entre as seções
    function toggleSections(showQueueResponse = false) {
        if (showQueueResponse) {
            clienteFormSection.style.display = 'none';
            queueResponseSection.style.display = 'block';
        } else {
            clienteFormSection.style.display = 'block';
            queueResponseSection.style.display = 'none';
        }
    }

    // Lógica para selecionar o barbeiro
    barberItems.forEach(item => {
        item.addEventListener('click', () => {
            barberItems.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            selectedBarberInput.value = item.getAttribute('data-barber');
        });
    });

    // Rota: POST /adicionar-cliente
    clienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome-cliente').value;
        const barbeiroId = selectedBarberInput.value;
        const barbeiroNome = barbers[barbeiroId];

        if (!nome || !barbeiroId) {
            alert('Por favor, preencha seu nome e escolha um barbeiro.');
            return;
        }

        joinQueueBtn.disabled = true;
        joinQueueBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Entrando na fila...';
        
        try {
            // Requisição para adicionar cliente
            const response = await fetch('http://localhost:3001/adicionar-cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, barbeiro: barbeiroId })
            });

            const data = await response.json();

            if (response.ok) {
                currentClientId = data.cliente_id;
                
                // Exibe o modal e atualiza a seção de espera
                const queuePosition = data.posicao; // Assume que o backend retorna a posição
                document.getElementById('modal-queue-info').innerHTML = `Você é o número <b>${queuePosition}</b> da fila para cortar com o <b>${barbeiroNome}</b>.`;
                const queueModal = new bootstrap.Modal(document.getElementById('queueModal'));
                queueModal.show();
                
                // Atualiza a tela de espera
                clientNameDisplay.textContent = nome;
                barberNameDisplay.textContent = barbeiroNome;
                queuePositionDisplay.textContent = queuePosition;
                
                toggleSections(true);

            } else {
                alert(`Erro ao entrar na fila: ${data.error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Erro na comunicação com o servidor:', error);
            alert('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
        } finally {
            joinQueueBtn.disabled = false;
            joinQueueBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i> Entrar na Fila';
        }
    });

    // Rota: POST /remover-cliente
    btnSairFila.addEventListener('click', async () => {
        if (!currentClientId) return;
        
        btnSairFila.disabled = true;
        btnSairFila.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saindo...';
        
        try {
            const response = await fetch('http://localhost:3001/remover-cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clienteId: currentClientId })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert(data.message);
                currentClientId = null;
                toggleSections(false);
            } else {
                alert(`Erro: ${data.error || 'Erro desconhecido'}`);
            }
        } catch (error) {
            console.error('Erro ao sair da fila:', error);
            alert('Erro de conexão com o servidor.');
        } finally {
            btnSairFila.disabled = false;
            btnSairFila.innerHTML = '<i class="fas fa-door-open me-2"></i> Sair da Fila';
        }
    });
});