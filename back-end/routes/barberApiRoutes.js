const express = require('express');
const router = express.Router();
const crypto = require('crypto');

module.exports = (db) => {

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