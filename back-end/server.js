require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const authenticateToken = require('./middleware/authMiddleware');
const createPublicQueueRoutes = require('./routes/publicQueueRoutes');
const createBarberApiRoutes = require('./routes/barberApiRoutes');
const createAuthRoutes = require('./routes/authRoutes');
const { supabasePublic, supabaseAdmin } = require('./supabaseClient'); // SDK Supabase

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../front-end/public')));

// Rotas de páginas públicas
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../front-end/public/index.html')));
app.get('/cliente', (req, res) => res.sendFile(path.join(__dirname, '../front-end/public/client.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../front-end/public/barber-login.html')));
app.get('/barbeiro', (req, res) => res.sendFile(path.join(__dirname, '../front-end/public/barber-dashboard.html')));

// Rotas da API
app.use('/api/auth', createAuthRoutes(supabaseAdmin)); // autenticação barbers (backend seguro)
app.use('/api/public', createPublicQueueRoutes(supabaseAdmin)); // fila pública (backend seguro)
app.use('/api/barber', authenticateToken, createBarberApiRoutes(supabaseAdmin)); // dashboard/barbers (backend seguro)

// Criação de barber padrão (somente se não existir)
(async () => {
    const defaultUsername = process.env.DEFAULT_USERNAME;
    const defaultPassword = process.env.DEFAULT_PASSWORD;

    try {
        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('barbers')
            .select('*')
            .eq('username', defaultUsername)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Erro ao verificar barber padrão:', fetchError.message);
        }

        if (!existing) {
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            const { data, error: insertError } = await supabaseAdmin
                .from('barbers')
                .insert([{ username: defaultUsername, password: hashedPassword }]);

            if (insertError) console.error('Erro ao criar barber padrão:', insertError.message);
            else console.log('Barber padrão criado no Supabase');
        } else {
            console.log('Barber padrão já existe');
        }
    } catch (err) {
        console.error('Erro ao criar barber padrão:', err.message);
    }
})();

// Inicia servidor
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
