const express = require('express');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');

const superLoginRoute = require('./routes/superRoutes');
const commercialAdminRoutes = require('./routes/commercialAdminRoutes');
const commonRoutes = require("./routes/common")


const checkAdminProperty = require('./middlewares/checkAdminProperty')
require('dotenv').config();
const path = require('path');
const cors = require('cors');
const { admin } = require('./db');
// const admin = require('firebase-admin');


const app = express();

const corsOptions = {
  origin: '*',
  credentials: true,
  optionsSuccessStatus: 200,
};
require('./Scheduler');
app.use(cors(corsOptions));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/test', (req, res, next) => {
  res.status(200).send('Hello world! We are running under HTTPS!');
});

app.use('/super', superLoginRoute);
app.use('/commercialAdmin', checkAdminProperty, commercialAdminRoutes);
app.use("/api", commonRoutes)

const port = process.env.PORT || 8000;

// Read SSL certificates
const cert = fs.readFileSync('localhost.crt');
const key = fs.readFileSync('localhost.key');

const server = https.createServer({ key, cert }, app);








// // if (process.env.NODE_ENV === "production") {
// console.log("BuildRunning!");
// app.use(express.static(path.join(__dirname, "build")));
// app.get("*", (req, res) => {
//   res.sendFile(path.resolve(__dirname, "build", "index.html"));
// });
// // }

server.listen(port, () => {
  console.log(`Server is listening on https://localhost:${port}`);
});


