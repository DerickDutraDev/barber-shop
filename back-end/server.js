require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const authenticateToken = require('./middleware/authMiddleware');
const createPublicQueueRoutes = require('./routes/publicQueueRoutes');
const createBarberApiRoutes = require('./routes/barberApiRoutes');
const createAuthRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../front-end/public')));

// Páginas HTML públicas
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../front-end/public/index.html')));
app.get('/cliente', (req, res) => res.sendFile(path.join(__dirname, '../front-end/public/client.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../front-end/public/barber-login.html')));

// Banco de dados
const dbPath = process.env.DB_PATH || path.join(__dirname, 'db', 'barbershop.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) throw err;
    console.log('Conectado ao SQLite');

    db.run(
        `CREATE TABLE IF NOT EXISTS clients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            barber TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    );

    db.run(
        `CREATE TABLE IF NOT EXISTS barbers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`
    );

    // Insere usuário padrão do .env
    const defaultUsername = process.env.DEFAULT_USERNAME;
    const defaultPassword = process.env.DEFAULT_PASSWORD;
    const saltRounds = 10;

    bcrypt.hash(defaultPassword, saltRounds, (err, hash) => {
        if (err) console.error(err);
        db.run(
            `INSERT OR IGNORE INTO barbers (username, password) VALUES (?, ?)`,
            [defaultUsername, hash]
        );
    });

    // Rotas
    app.use('/api/auth', createAuthRoutes(db));
    app.use('/api/public', createPublicQueueRoutes(db));
    app.use('/api/barber', authenticateToken, createBarberApiRoutes(db));

    // Dashboard HTML
    app.get('/barbeiro', (req, res) => {
        res.sendFile(path.join(__dirname, '../front-end/public/barber-dashboard.html'));
    });

    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
});
