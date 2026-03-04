const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'dados.json');

async function initDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DATA_FILE);
    } catch {
      await fs.writeFile(DATA_FILE, JSON.stringify({ 
        webhookUrl: '[https://seu-dominio.n8n.cloud/webhook/direitos-trabalhistas](https://seu-dominio.n8n.cloud/webhook/direitos-trabalhistas)', 
        leads: [] 
      }, null, 2));
    }
  } catch (error) {
    console.error('Erro ao iniciar o arquivo de dados:', error);
  }
}

initDataFile();

async function readDb() {
  const data = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

async function writeDb(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/config', async (req, res) => {
  try {
    const db = await readDb();
    res.json({ webhookUrl: db.webhookUrl });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

app.post('/api/config', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    const db = await readDb();
    db.webhookUrl = webhookUrl;
    await writeDb(db);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

app.get('/api/leads', async (req, res) => {
  try {
    const db = await readDb();
    res.json(db.leads);
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

app.post('/api/leads', async (req, res) => {
  try {
    const newLead = req.body;
    const db = await readDb();
    db.leads.unshift(newLead);
    await writeDb(db);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erro no servidor' }); }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
