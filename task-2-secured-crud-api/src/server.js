require('dotenv').config();
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required. Copy .env.example to .env and set it.');
const app = require('./app');
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`CRUD API listening on http://localhost:${port}`));