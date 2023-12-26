const express = require('express');
const bodyparser = require('body-parser');
const mysql = require('mysql2');
require("dotenv").config();
const validator = require('validator');
const path = require('path');
const { URL } = require('url');
// const publicPath = path.join(__dirname, '../public');
const { url } = require('inspector');
// const {Game} = require('./game.js');
// const {Card} = require('./models/card.js');
const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";


const port = process.env.NODE_DOCKER_PORT || '3000';
const exposedPort = process.env.NODE_LOCAL_PORT;
let app = express();
app.use(bodyparser.urlencoded({extended: false}));
// // app.use(bodyparser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: 'mysql'
  });

  connection.query(`create table if not exists urls (URL_ID int NOT NULL AUTO_INCREMENT PRIMARY KEY, URL_STRING varchar(255) NOT NULL, 
  CREATION_TIME timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP) AUTO_INCREMENT = 1000;`)

app.post('/save', (req, res)=>{
  let userUrl = req.body.urlString;
  if (!validator.isURL(userUrl)) {
    res.status(400).send('Bad request');
  }
  connection.execute(
    `INSERT INTO urls(URL_STRING, CREATION_TIME) VALUES (?, CURRENT_TIMESTAMP())`,
    [userUrl],
    function(err, results, fields) {
      console.log(err); // results contains rows returned by server
      if (err != null) {
        res.status(500).send({message: "INTERNAL_SERVER_ERROR"});
      }
      let insertId = results.insertId;
      let base58Str = convertToBase58(insertId);
      res.status(200).send(`<!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>UtilityApp</title>
        <base href="/">
      
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="icon" type="image/x-icon" href="favicon.ico">
        <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500" rel="stylesheet">
        <link href="index.css" rel="stylesheet">
      </head>
      <body>
          <h1>URL Shortener</h1>
        <div>
          <p id='url'>http://localhost:${exposedPort}/go/${base58Str}</p>
        </div>
      </body>
      </html>`);
    }
  );
});

app.get('/go/:code', (req, res) => {
    let code = req.params.code;
    let id = convertToBase10(code);
    console.log(`id is ${id}`);
    if (id == -1)
        res.status(404).send();
    connection.execute(
    `SELECT * FROM urls WHERE URL_ID = ?`,
    [id],
    function(err, results, fields) {
      console.log(results); // results contains rows returned by server
      if (err != null) {
        res.status(500).send({message: "INTERNAL_SERVER_ERROR"});
      }
      if (results.length == 0)
        res.status(404).send();
      else {
        let urlString = results[0].URL_STRING;
        if (!urlString.startsWith('http'))
            urlString = 'http://' + urlString;
        console.log(urlString);
        res.redirect(301, urlString);
      }
    }
  );
});

app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname, '..', 'public/index.html'));
});

const convertToBase58 = function(x) {
    let base58 = "";
    while (x > 0) {
        let rem = x%58;
        base58 = chars.charAt(rem) + base58;
        x = Math.floor(x/ 58);
    }
    return base58;
}

const convertToBase10 = function(x) {
    let num = 0;
    let count = 0;
    for (let i=x.length-1; i>=0; i--) {
        let c = x.charAt(i);
        let index = chars.indexOf(c);
        if (index == -1)
            return -1;
        num += Math.pow(58, count) * index;
        count++;
    }
    return num;
}


app.listen(port, ()=>{
  console.log(`Connected on ${port}`);
});
