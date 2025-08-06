const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Configurazione password admin
const ADMIN_PASSWORD = 'La9k!s39G@u'; // Puoi cambiarla
const ACTIVE_TOKENS = new Set();

// DB setup
const db = new sqlite3.Database('./db.sqlite');
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS dati (
      id TEXT PRIMARY KEY,
      intSet REAL,
      itaSet REAL,
      advSet REAL
    )
  `);
});

app.use(express.json());
app.use(express.static('public'));

// Salvataggio dati
app.post('/api/salva', (req, res) => {
  const { fingerprint, intSet, itaSet, advSet } = req.body;

  db.get("SELECT * FROM dati WHERE id = ?", [fingerprint], (err, row) => {
    if (row) {
      return res.status(409).json({ error: "Hai già inserito i dati." });
    }

    db.run("INSERT INTO dati (id, intSet, itaSet, advSet) VALUES (?, ?, ?, ?)",
      [fingerprint, intSet, itaSet, advSet],
      err => {
        if (err) return res.status(500).json({ error: "Errore nel salvataggio" });
        res.json({ ok: true });
      }
    );
  });
});

// Media globale
app.get('/api/media', (req, res) => {
  db.all("SELECT intSet, itaSet, advSet FROM dati", (err, rows) => {
    if (err) return res.status(500).json({ error: "Errore nel calcolo" });
    if (rows.length === 0) return res.json({ int: 0, ita: 0, adv: 0 });

    const n = rows.length;
    const media = rows.reduce((acc, row) => {
      acc.int += row.intSet;
      acc.ita += row.itaSet;
      acc.adv += row.advSet;
      return acc;
    }, { int: 0, ita: 0, adv: 0 });

    res.json({
      int: media.int / n,
      ita: media.ita / n,
      adv: media.adv / n
    });
  });
});

// Login admin (restituisce token)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomUUID();
    ACTIVE_TOKENS.add(token);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Password errata' });
  }
});

// Lista dati (autenticata)
app.get('/api/admin/dati', (req, res) => {
  const token = req.headers.authorization;
  if (!token || !ACTIVE_TOKENS.has(token)) {
    return res.status(401).json({ error: "Accesso non autorizzato" });
  }

  db.all("SELECT intSet, itaSet, advSet FROM dati", (err, rows) => {
    if (err) return res.status(500).json({ error: "Errore DB" });
    res.json(rows);
  });
});
// Aggiunte lato server.js

const fs = require('fs');
const PDFDocument = require('pdfkit');

// Rotta per svuotare il database (protetta da token)
app.post('/api/admin/reset', (req, res) => {
  const token = req.headers.authorization;
  if (!token || !ACTIVE_TOKENS.has(token)) {
    return res.status(401).json({ error: "Accesso non autorizzato" });
  }
  db.run("DELETE FROM dati", err => {
    if (err) return res.status(500).json({ error: "Errore durante il reset" });
    res.json({ ok: true });
  });
});

// Rotta per generare il PDF (protetta da token)
app.get('/api/admin/pdf', (req, res) => {
  const token = req.headers.authorization;
  if (!token || !ACTIVE_TOKENS.has(token)) {
    return res.status(401).json({ error: "Accesso non autorizzato" });
  }

  db.all("SELECT intSet, itaSet, advSet FROM dati", (err, rows) => {
    if (err) return res.status(500).json({ error: "Errore DB" });

    const doc = new PDFDocument();
    const filePath = path.join(__dirname, 'riepilogo.pdf');
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(16).text('Riepilogo dati raccolti', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text('Internazionale | Italiano | Pubblicitario');
    rows.forEach(r => {
      doc.text(`${r.intSet} | ${r.itaSet} | ${r.advSet}`);
    });

    const n = rows.length;
    const media = rows.reduce((acc, row) => {
      acc.int += row.intSet;
      acc.ita += row.itaSet;
      acc.adv += row.advSet;
      return acc;
    }, { int: 0, ita: 0, adv: 0 });

    doc.moveDown();
    doc.fontSize(14).text('Medie finali:');
    doc.fontSize(12).text(`Internazionale: ${(media.int / n).toFixed(2)}`);
    doc.text(`Italiano: ${(media.ita / n).toFixed(2)}`);
    doc.text(`Pubblicitario: ${(media.adv / n).toFixed(2)}`);

    doc.end();

    stream.on('finish', () => {
      res.download(filePath, 'riepilogo.pdf', err => {
        if (err) console.error('Errore nel download:', err);
        fs.unlinkSync(filePath); // elimina dopo il download
      });
    });
  });
});
app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
