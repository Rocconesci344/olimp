const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;
const USERS_FILE = path.join(__dirname, 'users.json');

// Middleware
app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta raíz para servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rutas de API
app.get('/users', (req, res) => {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'No se pudo leer el archivo de usuarios' });
  }
});

app.post('/users', (req, res) => {
  try {
    const newUser = req.body;

    if (!newUser.name || !newUser.email || !newUser.password) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));

    if (users.find(u => u.email.toLowerCase() === newUser.email.toLowerCase())) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }

    users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

    res.json(newUser);
  } catch (err) {
    res.status(500).json({ error: 'Error guardando usuario' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
