const express = require("express");
const cors = require('cors');
const axios = require("axios");
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
var app = express();

const options = {
    key: fs.readFileSync('./localhost-key.pem'),
    cert: fs.readFileSync('./localhost.pem')
};
  

const transformRequestForPost = (obj) => {
	var str = [];
	for(var p in obj){
		if(typeof obj[p] == "object"){
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(JSON.stringify(obj[p])));
		}else{
			str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
		}
	}
	return str.join("&");
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors({
    origin: 'http://localhost:8080',
    allowedHeaders: 'Content-Type',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use("*",(req, res) => {
    let query = "";

    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', 'http://localhost:8080'); // L'origine del tuo frontend Vue.js
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    if(Object.keys(req.query).length > 0){
        query = "?"+Object.keys(req.query).map(function(k) {
            return encodeURIComponent(k) + '=' + encodeURIComponent(req.query[k])
        }).join('&');
    }
    axios.defaults.withCredentials = true;
    axios({
        method: req.method.toLowerCase(),
        url: "http://localhost:8888/api"+query,
        data: transformRequestForPost(req.body),
        withCredentials : true,
        headers:{
            Cookie: req.headers.cookie
        } 
    })
    .then((response) => {
        if(response.headers['set-cookie']){
            response.data.cookies = response.headers['set-cookie'];
        }
        res.send(response.data);
    })
    .catch((error) => {
        res.status(error.response.status).json(error.response.data)
    });
});
https.createServer(options, app).listen(3001, "localhost");