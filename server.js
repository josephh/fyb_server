var express = require('express');
var createJWT = require('jsonwebtoken');
var validateJWT = require('express-jwt');
var bodyParser = require('body-parser');
var request = require('request');
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

// secret used to construct json web token
app.secret = '09htfahpkc0qyw4ukrtag0gy20ktarpkcasht';

// send token to user that contains their id
app.sendToken = function (res, userId) {
    var token = createJWT.sign(
        // payload
        { userId: userId },
        // secret
        app.secret,
        // options
        { expiresIn: 60 }
    );
    res.send({ token: token });
    console.log('\tsent token ('+ token + ')');
}

/*
 * AUTHENTICATION respond with token to POST request to /get-token
 */
app.post('/get-token', bodyParser.json(), function (req, res) {

    // get Google token from Ember: { password: googleToken }
    var googleToken = req.body.password;
    console.log('googleToken (password): ' + googleToken);

    // send token to Google for validation
    request('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + googleToken, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log('\tGoogle Token Valid');
            var userId = JSON.parse(body).user_id;
            console.log('userId in response body from Google: ' + userId);
            var userEmail = JSON.parse(body).email;
            console.log('email in response body from Goodle: ' + userEmail);
            app.sendToken(res, userId);
        } else {
            console.log('\tFailed to validate Google Token');
            res.send({});
        }
    });
});

/*
 * AUTHENTICATION (Refresh token)
 */
app.post('/refresh-token', bodyParser.json(), function(req, res) {

    // verify token and extract contents (including userId)
    var oldToken = req.body.token;
    createJWT.verify(oldToken, app.secret, function (err, decodedToken) {
        if (!err) {
            // send new token
            console.log('\tRefreshing token for user ', decodedToken.userId);
            app.sendToken(res, decodedToken.userId);
        } else {
            // send error
            console.log('\tError while trying to refresh token:', err)
            res.send({});
        }
    });
});

/*
 * ENTRIES
 */
app.get('/entries', validateJWT({secret: app.secret}), function(req, res) {

    // get userId from token
    var userId = req.user.userId;

    var entries = {
        "url": "/entries?page=1",
        "entries": [
            {
                "id": 1,
                "lat": 51.0580297,
                "long": -1.7899643000000651,
                "datetime": "1447346130925"
            }, {
                "id": 2,
                "lat": 51.9489469,
                "long": -3.3914629999999306,
                "datetime": "1448349130925"
            }, {
                "id": 3,
                "lat": 54.08502,
                "long": -1.7552200000000084,
                "datetime": "1439349123456"
            }, {
                "id": 4,
                "lat": 54.08502,
                "long": -1.7899643000000651,
                "weather": "sunny",
                "datetime": "1447346130925"
            }, {
                "id": 5,
                "lat": 54.08502,
                "long": -1.7552200000000084,
                "weather": "rainy",
                "datetime": "1459349123456"
            }
        ]
    }

    // send notes to Ember
    res.send({ notes: notes });
});
