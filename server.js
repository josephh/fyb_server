var express = require('express');
var createJWT = require('jsonwebtoken');
var validateJWT = require('express-jwt');
var bodyParser = require('body-parser');
var request = require('request');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

var app = express(); // create the express server app ('app' by convention)
app.listen('4500');

// setup HTTP headers
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin',
    'http://localhost:4200');
  res.header("Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header('Access-Control-Allow-Methods',
    'POST, GET, PUT, DELETE, OPTIONS');
  res.header('Content-Type', 'application/json');
  next();
});

var GOOGLE_CLIENT_ID =
  '500707701090-h6ib4qve8b4rf445lpugjipn3bih9ere.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET = 'v4xPGZy1L4nRvax8zIp0oS-J',
  GOOGLE_REDIRECT_URL = 'http://localhost:4200';

var oauth2Client = new OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URL);

// GET
app.get('/', function (req, res) {
  res.send('GET app root response - from fyb express server');
});

// POST
app.post('/get-token', bodyParser.json(), function (req, res) {
  // body parser exposes any request properties via req.body
  var googleToken = req.body.password,
      authorizationCode = req.body.username,
      accessToken = null;

  if (authorizationCode) {
    console.log('FYB server >> authorization code provided from browser.');
    oauth2Client.getToken(authorizationCode, function(err, tokens, response) {
      /*
       * Unless error, tokens will contain an access_token and optionally a
       * refresh_token (see docs for when a refresh token is provided).
       */
      if (!err) {
        console.log('FYB server >> Google access token sucessfully fetched.');
        var token;
        for (token in tokens){
          console.log('\t'+ token + ' = ' + tokens[token]);
        }
        oauth2Client.setCredentials(tokens);
        oauth2Client.getAccessToken(function(err, t, resp){
          if (err) {
            return console.log('FYB server >> Problem getting access token. ' +
              ' Details: ' + err);
          } else{
            accessToken = t;
            app.buildAndReturnToken(t, res);
          }
        });
      } else {
        console.log('FYB server >> error trying to fetch authorization code.');
        return console.error('FYB server >> Err details: ' + err);
      }
    });
  }else if(googleToken) {
    console.log('FYB server >> google access token provided from browser');
    app.buildAndReturnToken(googleToken, res);
  }
});

/*
 * POST
 */
app.post('/refresh-token', bodyParser.json(), function(req, res) {
  var oldToken = req.body.token;
  createJWT.verify(oldToken, GOOGLE_CLIENT_SECRET, function (err, decodedToken) {
    if (!err) {
      console.log('FYB server >> Refreshing token for user id = ',
        decodedToken.userId);
      app.sendToken(res, decodedToken.userId);
    } else {
      console.log('FYB server >> Error while trying to refresh token:', err)
      res.send({});
    }
  });
});

/*
 * GET
 */
app.get('/entries', validateJWT({secret: GOOGLE_CLIENT_SECRET}),
  function(req, res) {

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

/*
 * Create a JSON web token containing the user id (in the format, e.g.
 * '116235875194006686469'), digitally sign it and return that to the browser,
 * along with any options, (e.g. expiresIn).
 */
app.sendToken = function (res, userId) {
    var token = createJWT.sign(
        { userId: userId }, GOOGLE_CLIENT_SECRET, { expiresIn: 60 }
    );
    res.send({ token: token });
}

app.buildAndReturnToken = function buildAndSend(accessToken, res){
  request('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token='
    + accessToken,
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        console.log('FYB server >> Google access token successfully used to ' +
        'fetch token info.');
        var userId = JSON.parse(body).user_id;
        console.log('\tuserId = ' + userId);
        var userEmail = JSON.parse(body).email;
        console.log('\temail = ' + userEmail);
        app.sendToken(res, userId);
      } else {
        console.log('FYB server >> Failed to fetch token info.');
        response.send({});
      }
  });
};
