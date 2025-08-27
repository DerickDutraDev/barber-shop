const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// O módulo agora exporta uma função que recebe a instância do banco de dados
module.exports = (db) => {

    // Endpoint para adicionar um cliente na fila
    router.post('/join-queue', (req, res) => {
        const { name, barber } = req.body;
        const clientId = crypto.randomUUID();
    
        if (!name || !barber) {
            return res.status(400).json({ error: 'Nome e barbeiro são obrigatórios.' });
        }
    
        db.run(
            `INSERT INTO clients (id, name, barber) VALUES (?, ?, ?)`,
            [clientId, name, barber],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao adicionar cliente na fila.' });
                }
                db.all(
                    `SELECT id FROM clients WHERE barber = ? ORDER BY timestamp ASC`,
                    [barber],
                    (err, rows) => {
                        if (err) {
                            return res.status(500).json({ error: 'Erro ao obter a posição na fila.' });
                        }
                        const position = rows.findIndex(row => row.id === clientId) + 1;
                        res.status(201).json({
                            message: 'Cliente adicionado à fila com sucesso!',
                            clientId,
                            position
                        });
                    }
                );
            }
        );
    });
    
    // Endpoint para remover um cliente da fila
    router.post('/leave-queue', (req, res) => {
        const { clientId } = req.body;
        if (!clientId) {
            return res.status(400).json({ error: 'ID do cliente é obrigatório.' });
        }
        db.run(`DELETE FROM clients WHERE id = ?`, [clientId], function (err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao remover cliente da fila.' });
            }
            res.status(200).json({ message: 'Cliente removido da fila.' });
        });
    });
    
    // Endpoint para o barbeiro atender um cliente
    router.post('/serve-client', (req, res) => {
        const { clientId } = req.body;
        if (!clientId) {
            return res.status(400).json({ error: 'ID do cliente é obrigatório.' });
        }
        db.run(`DELETE FROM clients WHERE id = ?`, [clientId], function (err) {
            if (err) {
                return res.status(500).json({ error: 'Erro ao atender cliente.' });
            }
            res.status(200).json({ message: 'Cliente atendido com sucesso.' });
        });
    });
    
    // Endpoint para o barbeiro adicionar um cliente manualmente
    router.post('/adicionar-cliente-manual', (req, res) => {
        const { nome, barbeiro } = req.body;
        const clientId = crypto.randomUUID();
        if (!nome || !barbeiro) {
            return res.status(400).json({ error: 'Nome e barbeiro são obrigatórios.' });
        }
        
        // CORREÇÃO: Converte o nome do barbeiro para minúsculas antes de salvar
        const barbeiroLowerCase = barbeiro.toLowerCase();

        db.run(
            `INSERT INTO clients (id, name, barber) VALUES (?, ?, ?)`,
            [clientId, nome, barbeiroLowerCase],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: 'Erro ao adicionar cliente na fila.' });
                }
                res.status(201).json({
                    message: 'Cliente adicionado manualmente com sucesso!',
                    clientId
                });
            }
        );
    });
    
    // Endpoint para obter a fila completa para o dashboard
    router.get('/queues', (req, res) => {
        const barbers = ['junior', 'yago', 'reine'];
        const queues = { junior: [], yago: [], reine: [] };
        let completed = 0;
    
        const checkCompletion = () => {
            completed++;
            if (completed === barbers.length) {
                res.status(200).json(queues);
            }
        };
    
        barbers.forEach(barber => {
            db.all(
                `SELECT id, name FROM clients WHERE barber = ? ORDER BY timestamp ASC`,
                [barber],
                (err, rows) => {
                    if (err) {
                        console.error(`Erro ao buscar fila do barbeiro ${barber}:`, err);
                        queues[barber] = [];
                    } else {
                        queues[barber] = rows.map(row => ({
                            clientId: row.id,
                            name: row.name
                        }));
                    }
                    checkCompletion();
                }
            );
        });
    });
    
    return router;
};