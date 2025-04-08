// server.js

const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
// require('dotenv').config();   // Removed because .env is not needed

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Load your service account credentials (make sure this file is in your project folder but NOT uploaded to GitHub)
const credentials = JSON.parse(fs.readFileSync('select-program-456118-a1a8ed8301b2.json'));

// Setup Google API auth using the service account
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Your Google Sheet ID (update if needed)
const SPREADSHEET_ID = '1BP16GCFseVXYhnklxwJWKgKpcXhYdvmaqMC3OxSf8-s';

// Endpoint to get program data (range: A2:D13 on sheet "program")
app.get('/program-data', async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({version: 'v4', auth: client});
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'program!A2:D13', // Adjust range if needed
    });
    const rows = response.data.values || [];
    const programs = rows.map(r => ({
      program:   r[0],
      capacity:  r[1],
      reserved:  r[2],
      available: r[3]
    }));
    res.json(programs);
  } catch (error) {
    console.error('Error getting program data:', error);
    res.status(500).send('Error getting program data');
  }
});

// Endpoint to look up a student based on studentId (assumes sheet "name" has header in first row)
app.get('/student-info', async (req, res) => {
  const studentId = req.query.studentId;
  if (!studentId) return res.status(400).json({ error: 'Missing studentId' });
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({version: 'v4', auth: client});
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'name',  // entire sheet (with header)
    });
    const rows = response.data.values || [];
    if (rows.length === 0) return res.json({ found: false });
    
    // Find the row where studentId (in column B, index 1) matches
    const foundRow = rows.find(row => String(row[1]).trim() === String(studentId).trim());
    if (!foundRow) {
      return res.json({ found: false });
    }
    // Assume columns: index 2: title, index 3: name, index 4: surname
    res.json({
      found: true,
      title: foundRow[2] || '',
      name: foundRow[3] || '',
      surname: foundRow[4] || ''
    });
  } catch (error) {
    console.error('Error in student lookup:', error);
    res.status(500).send('Error looking up student info');
  }
});

// Endpoint to get all submissions from sheet "input" (starting at row 2)
app.get('/input-data', async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({version: 'v4', auth: client});
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'input!A2:F',  // Adjust as necessary
    });
    const rows = response.data.values || [];
    const submissions = rows.map(r => ({
      studentId: r[1] || '',
      title: r[2] || '',
      name: r[3] || '',
      surname: r[4] || '',
      program: r[5] || '',
    }));
    res.json(submissions);
  } catch (error) {
    console.error('Error getting input data:', error);
    res.status(500).send('Error getting input data');
  }
});

// Endpoint to submit data to sheet "input"
app.post('/submit-data', async (req, res) => {
  const { studentId, title, name, surname, program } = req.body;
  if (!studentId || !title || !name || !surname || !program) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({version: 'v4', auth: client});
    const now = new Date();
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'input!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[now.toISOString(), studentId, title, name, surname, program]]
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error submitting data:', error);
    res.status(500).send('Error submitting data');
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
