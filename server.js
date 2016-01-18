var express = require('express');
var createJWT = require('jsonwebtoken');
var validateJWT = require('express-jwt');
var bodyParser = require('body-parser');
var request = require('request');
var app = express();
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

app.listen('4500');

// setup HTTP headers
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.header('Content-Type', 'application/json');
    next();
});

// google details
var GOOGLE_CLIENT_ID = '500707701090-h6ib4qve8b4rf445lpugjipn3bih9ere.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET = 'v4xPGZy1L4nRvax8zIp0oS-J',
  GOOGLE_REDIRECT_URL = 'http://localhost:4200';

var oauth2Client = new OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL);

// respond with "yolo" to a GET request to the root (localhost:4500)
app.get('/', function (req, res) {
    res.send('yolo');
});

// send token to user that contains their id
app.sendToken = function (res, userId) {
    var token = createJWT.sign(
        // payload
        { userId: userId },
        // secret
        GOOGLE_CLIENT_SECRET,
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
    console.log(req.body);
    var password = req.body.password, authorizationCode = req.body.username,
      accessToken = null;
    console.log('password: ' + password);  // this is, admittedly, confusing nomenclature for variables
                        // (the password is actually the google access token and the username is the authorizationCode)
    console.log('authorization code: ' + authorizationCode);

    if(authorizationCode){
      console.log('authorization code token if block...');
      // send token to Google for validation
      oauth2Client.getToken(authorizationCode, function(err, tokens, response) {
        // Now tokens contains an access_token and an optional refresh_token. Save them.
        if(!err) {
          var token;
          for (token in tokens){
            console.log('next token: '+ token + '.  value = ' + tokens[token]);
          }
          oauth2Client.setCredentials(tokens);

          console.log('\tGoogle Access Token returned');
        }
        else{
          console.log('error in trying to get authorization code.');
          console.error('err details: ' + err);
        }
      });
    };

    if(password) {
      console.log('access token if block...');
      sendToken(password, res)();
    }
    else {
      sendToken(null, res)();
    };

});

var sendToken = function buildAndSendToken(token, response){
  var accessToken = null;

  return function(err, token, response){

    if(token == null){
      oauth2Client.getAccessToken(function(err, t, res){
        if(err){
          return console.log('problem getting access token. Details: ' + err);
        }
        else{
          accessToken = t;
        }
      });
    };

    if(accessToken){
        request('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + accessToken, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log('\tGoogle Token Valid');
            var userId = JSON.parse(body).user_id;
            console.log('userId in response body from Google: ' + userId);
            var userEmail = JSON.parse(body).email;
            console.log('email in response body from Google: ' + userEmail);
            app.sendToken(response, userId);
        } else {
            console.log('\tFailed to validate Google Token');
            response.send({});
        }
      });
    }

  }
};

/*
 * AUTHENTICATION (Refresh token)
 */
app.post('/refresh-token', bodyParser.json(), function(req, res) {

    // verify token and extract contents (including userId)
    var oldToken = req.body.token;
    createJWT.verify(oldToken, GOOGLE_CLIENT_SECRET, function (err, decodedToken) {
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
app.get('/entries', validateJWT({secret: GOOGLE_CLIENT_SECRET}), function(req, res) {

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
