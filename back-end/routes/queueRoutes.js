const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (supabase) => {

    // Adicionar cliente à fila (público)
    router.post('/join-queue', async (req, res) => {
        const { name, barber } = req.body;
        const clientId = crypto.randomUUID();

        if (!name || !barber) {
            return res.status(400).json({ error: 'Nome e barbeiro são obrigatórios.' });
        }

        try {
            await supabase
                .from('clients')
                .insert([{ id: clientId, name, barber: barber.toLowerCase() }]);

            const { data: rows, error } = await supabase
                .from('clients')
                .select('id')
                .eq('barber', barber.toLowerCase())
                .order('timestamp', { ascending: true });

            if (error) throw error;

            const position = rows.findIndex(row => row.id === clientId) + 1;

            res.status(201).json({
                message: 'Cliente adicionado à fila com sucesso!',
                clientId,
                position
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao adicionar cliente na fila.' });
        }
    });

    // Remover cliente da fila (público ou logout)
    router.post('/leave-queue', async (req, res) => {
        const { clientId } = req.body;
        if (!clientId) return res.status(400).json({ error: 'ID do cliente é obrigatório.' });

        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

            if (error) throw error;

            res.status(200).json({ message: 'Cliente removido da fila.' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao remover cliente da fila.' });
        }
    });

    // Atender cliente (usado pelo barbeiro)
    router.post('/serve-client', async (req, res) => {
        const { clientId } = req.body;
        if (!clientId) return res.status(400).json({ error: 'ID do cliente é obrigatório.' });

        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', clientId);

            if (error) throw error;

            res.status(200).json({ message: 'Cliente atendido com sucesso.' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao atender cliente.' });
        }
    });

    // Adicionar cliente manualmente (dashboard)
    router.post('/adicionar-cliente-manual', async (req, res) => {
        const { nome, barbeiro } = req.body;
        const clientId = crypto.randomUUID();

        if (!nome || !barbeiro) {
            return res.status(400).json({ error: 'Nome e barbeiro são obrigatórios.' });
        }

        try {
            const { data, error } = await supabase
                .from('clients')
                .insert([{ id: clientId, name: nome, barber: barbeiro.toLowerCase() }])
                .select()
                .single();

            if (error) throw error;

            res.status(201).json({
                message: 'Cliente adicionado manualmente com sucesso!',
                clientId: data.id
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao adicionar cliente manualmente.' });
        }
    });

    // Obter fila completa (dashboard)
    router.get('/queues', async (req, res) => {
        const barbers = ['junior', 'yago', 'reine'];
        const queues = { junior: [], yago: [], reine: [] };

        try {
            await Promise.all(barbers.map(async barber => {
                const { data, error } = await supabase
                    .from('clients')
                    .select('id, name')
                    .eq('barber', barber)
                    .order('timestamp', { ascending: true });

                if (error) {
                    console.error(`Erro ao buscar fila do barbeiro ${barber}:`, error.message);
                    queues[barber] = [];
                } else {
                    queues[barber] = data.map(row => ({ clientId: row.id, name: row.name }));
                }
            }));

            res.status(200).json(queues);

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro ao buscar filas.' });
        }
    });

    return router;
};
