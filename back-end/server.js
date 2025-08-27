const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Importa a função de rotas
const createQueueRoutes = require('./routes/queueRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do front-end
app.use(express.static(path.join(__dirname, '../front-end/public')));

// Rota segura para o dashboard do barbeiro
app.get('/barbeiro', (req, res) => {
    res.sendFile(path.join(__dirname, '../front-end/public/barber-dashboard.html'));
});

// Configuração do banco de dados SQLite e criação da tabela
const dbPath = path.join(__dirname, 'db', 'barbershop.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar com o banco de dados:', err.message);
        // Pode ser útil encerrar a aplicação se o banco de dados falhar
        process.exit(1); 
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        db.run(
            `CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                barber TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            (err) => {
                if (err) {
                    console.error('Erro ao criar a tabela:', err.message);
                    process.exit(1);
                } else {
                    console.log('Tabela "clients" verificada/criada com sucesso.');
                    // Usa a função de rotas, passando a instância do banco de dados
                    app.use('/api', createQueueRoutes(db));

                    // Inicia o servidor somente após a conexão com o banco de dados
                    app.listen(PORT, () => {
                        console.log(`Servidor rodando na porta ${PORT}`);
                    });
                }
            }
        );
    }
});