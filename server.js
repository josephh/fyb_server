// express framework for routing
var express = require('express');

// create and validate json web tokens
var createJWT = require('jsonwebtoken');
var validateJWT = require('express-jwt');

var app = express();
app.listen('4500');

// setup HTTP headers
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.header('Content-Type', 'application/json');
    next();
});

// respond with "yolo" to a GET request to the root (localhost:4500)
app.get('/', function (req, res) {
    res.send('yolo');
});

// respond with token to POST request to /get-token
app.post('/get-token', function (req, res) {
    var token = createJWT.sign(
        // payload
        { currentUserId: 1 },
        // secret
        '09htfahpkc0qyw4ukrtag0gy20ktarpkcasht',
        // options
        { expiresIn: 600 }
    );
    res.send({ token: token });
    console.log('\tsent token');
});
