// api/index.js
const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Importações dos arquivos de rotas e middleware
const createAuthRoutes = require('../routes/authRoutes');
const createPublicQueueRoutes = require('../routes/publicQueueRoutes');
const createBarberApiRoutes = require('../routes/barberApiRoutes');
const authenticateToken = require('../middleware/authMiddleware');

console.log("Iniciando a API...");

// Inicialização Supabase
console.log("Tentando criar conexão com Supabase...");
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
console.log("Conexão com Supabase criada.");

const app = express();
app.use(cors());
app.use(express.json());

// Montagem das rotas
console.log("Montando rotas...");
app.use('/api/auth', createAuthRoutes(supabaseAdmin));
app.use('/api/public', createPublicQueueRoutes(supabaseAdmin));
app.use('/api/barber', authenticateToken, createBarberApiRoutes(supabaseAdmin));

console.log("Rotas configuradas.");

module.exports = serverless(app);
console.log("Servidor serverless exportado. Pronto para receber requisições.");