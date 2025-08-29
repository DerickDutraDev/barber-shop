const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (supabaseAdmin) => {

    // Adicionar cliente na fila
    router.post('/join-queue', async (req, res) => {
        const { name, barber } = req.body;
        const clientId = crypto.randomUUID();

        if (!name || !barber) {
            return res.status(400).json({ error: 'Nome e barbeiro são obrigatórios.' });
        }

        try {
            // Inserir cliente usando supabaseAdmin (service role)
            const { data: inserted, error: insertError } = await supabaseAdmin
                .from('clients')
                .insert([{
                    id: clientId,
                    name,
                    barber: barber.toLowerCase(),
                    status: 'waiting',
                    timestamp: new Date().toISOString()
                }])
                .select();

            if (insertError) {
                console.error('Erro detalhado do Supabase:', insertError);
                return res.status(500).json({ 
                    error: 'Erro ao adicionar cliente na fila.', 
                    details: insertError 
                });
            }

            // Buscar todos os clientes esperando para esse barbeiro, ordenados pelo timestamp
            const { data: rows, error } = await supabaseAdmin
                .from('clients')
                .select('id')
                .eq('barber', barber.toLowerCase())
                .eq('status', 'waiting')
                .order('timestamp', { ascending: true });

            if (error) {
                console.error('Erro ao buscar fila:', error);
                return res.status(500).json({ error: 'Erro ao buscar fila.', details: error });
            }

            const position = rows.findIndex(row => row.id === clientId) + 1;

            // Remoção automática só após insert confirmado
            setTimeout(async () => {
                try {
                    await supabaseAdmin.from('clients').delete().eq('id', clientId);
                    console.log(`Cliente ${clientId} removido automaticamente da fila.`);
                } catch (err) {
                    console.error('Erro ao remover cliente automaticamente:', err.message);
                }
            }, 780000); // 780 segundos

            res.status(201).json({
                message: 'Cliente adicionado à fila com sucesso!',
                clientId,
                position
            });

        } catch (err) {
            console.error('Erro ao entrar na fila (catch):', err);
            res.status(500).json({ error: 'Erro ao adicionar cliente na fila.', details: err });
        }
    });

    // Remover cliente da fila manualmente
    router.post('/leave-queue', async (req, res) => {
        const { clientId } = req.body;
        if (!clientId) return res.status(400).json({ error: 'ID do cliente é obrigatório.' });

        try {
            const { error } = await supabaseAdmin
                .from('clients')
                .delete()
                .eq('id', clientId);

            if (error) {
                console.error('Erro ao remover cliente:', error);
                return res.status(500).json({ error: 'Erro ao remover cliente da fila.', details: error });
            }

            res.status(200).json({ message: 'Cliente removido da fila.' });
        } catch (err) {
            console.error('Erro ao remover cliente (catch):', err);
            res.status(500).json({ error: 'Erro ao remover cliente da fila.', details: err });
        }
    });

    // Obter a fila completa (público)
    router.get('/queues', async (req, res) => {
        const barbers = ['junior', 'yago', 'reine'];
        const queues = { junior: [], yago: [], reine: [] };

        try {
            await Promise.all(barbers.map(async barber => {
                const { data, error } = await supabaseAdmin
                    .from('clients')
                    .select('id, name')
                    .eq('barber', barber)
                    .eq('status', 'waiting')
                    .order('timestamp', { ascending: true });

                if (error) {
                    console.error(`Erro ao buscar fila do barbeiro ${barber}:`, error);
                    queues[barber] = [];
                } else {
                    queues[barber] = data.map(row => ({
                        clientId: row.id,
                        name: row.name
                    }));
                }
            }));

            res.status(200).json(queues);

        } catch (err) {
            console.error('Erro ao buscar filas (catch):', err);
            res.status(500).json({ error: 'Erro ao buscar filas.', details: err });
        }
    });

    return router;
};
