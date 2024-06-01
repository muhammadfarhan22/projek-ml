const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const { setupRoutes } = require('./router');

// Initialize Firebase with the appropriate service account
var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://psychic-acronym-406803-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const app = express();
const port = 8080;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Content-Type');
	next();
});

setupRoutes(app);

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
