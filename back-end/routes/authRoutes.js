const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const DEFAULT_USERNAME = process.env.DEFAULT_USERNAME;
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD;

// Refresh tokens em memória (em produção, pode usar DB)
let refreshTokens = [];

module.exports = (supabase) => {

    // LOGIN
    router.post('/login', async (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Usuário e senha obrigatórios.' });

        try {
            // Busca barber no Supabase
            const { data: user, error } = await supabase
                .from('barbers')
                .select('*')
                .eq('username', username)
                .single();

            if (error && error.code !== 'PGRST116') {
                return res.status(500).json({ error: 'Erro interno.' });
            }

            if (!user) {
                // Se não existir no Supabase, verifica credenciais do .env
                if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
                    return createTokensAndRespond(username, res);
                }
                return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
            }

            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });

            createTokensAndRespond(user.username, res);

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Erro interno.' });
        }
    });

    // REFRESH TOKEN
    router.post('/refresh', (req, res) => {
        const { refreshToken } = req.body;
        if (!refreshToken || !refreshTokens.includes(refreshToken)) {
            return res.status(403).json({ error: 'Refresh token inválido.' });
        }

        try {
            const data = jwt.verify(refreshToken, REFRESH_SECRET);
            const accessToken = jwt.sign({ username: data.username }, ACCESS_SECRET, { expiresIn: '1h' });
            const newRefreshToken = jwt.sign({ username: data.username }, REFRESH_SECRET, { expiresIn: '20h' });

            // Atualiza lista de refresh tokens
            refreshTokens = refreshTokens.filter(t => t !== refreshToken);
            refreshTokens.push(newRefreshToken);

            res.json({ accessToken, refreshToken: newRefreshToken });
        } catch {
            res.status(403).json({ error: 'Token expirado ou inválido.' });
        }
    });

    // LOGOUT
    router.post('/logout', (req, res) => {
        const { refreshToken } = req.body;
        if (refreshToken) refreshTokens = refreshTokens.filter(t => t !== refreshToken);
        res.json({ message: 'Logout realizado com sucesso.' });
    });

    function createTokensAndRespond(username, res) {
        const accessToken = jwt.sign({ username }, ACCESS_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ username }, REFRESH_SECRET, { expiresIn: '20h' });
        refreshTokens.push(refreshToken);
        res.json({ accessToken, refreshToken, message: 'Login bem-sucedido.' });
    }

    return router;
};
