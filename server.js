require('dotenv').load();
var express = require('express');
var createJWT = require('jsonwebtoken');
var validateJWT = require('express-jwt');
var bodyParser = require('body-parser');
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var cors = require('cors');
var _request = require('request');
var googleOAuthEndpoint = 'https://www.googleapis.com/oauth2/v3/token';
var googleOAuthUserInfoEndpoint = 'https://www.googleapis.com/oauth2/v2/userinfo';
var facebookOAuthEndpoint = 'https://graph.facebook.com/v2.5/oauth';
var twitterOAuthEndpoint = 'https://api.twitter.com/oauth/access_token';

var app = express(); // create the express server app ('app' by convention)

app.use(cors());
app.use(bodyParser.json());
app.listen('4500');

// in-memory hash
var userDb = require('./src/user-db');
var s3Client = require('./src/s3-client');

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

var GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET,
  FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET,
  TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID,
  TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET,
  FYB_REDIRECT_URL = process.env.FYB_REDIRECT_URI;

var oauth2Client = new OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
  FYB_REDIRECT_URL);

function exchangeAuthorizationCode(endpoint, authForm, callback) {

  var grantType = 'authorization_code';

  _request.post({
    url: endpoint,
    form: authForm
  }, function(err, httpRes, body) {
    body = JSON.parse(body);

    /** TODO commenting to see if this is happening too soon(?)

    if (body.id_token) {
      body.id_token = '{hidden}';
    }
    if (body.refresh_token) {
      body.refresh_token = '{hidden}';
    }

**/
    callback(err, body);
  });
}

app.get('/s3-signed-url', function (req, res) {
  s3Client.getSignedUrl(req, res);
});

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
          } else {
            accessToken = t;
            app.buildAndReturnToken(t, res);
          }
        });
      } else {
        console.log('FYB server >> error trying to fetch authorization code.');
        return console.error('FYB server >> Err details: ' + err);
      }
    });
  } else if(googleToken) {
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
};

app.buildAndReturnToken = function buildAndSend(accessToken, res){
  _request('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token='
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

// this checks if the user is signed-in
app.get('/users/:id', function(request, response) {
  var id = request.params.id;

  var user = userDb.findById(id);
  if (user) {
    response.send(user);
  } else {
    response.status(404).send('not found');
  }
});

// this signs out the user
app.delete('/users/:id', function(request, response) {
  userDb.removeId(request.params.id);

  response.status(204).send({});
});

app.post('/exchange-authorization-code', function(request, response) {
  var authorizationCode = request.body.authorizationCode,
      provider = request.body.provider,
      form = { code: authorizationCode, grant_type: 'authorization_code' },
      url = '';

  if (provider && provider === 'google-oauth2') {
    form.client_id = GOOGLE_CLIENT_ID;
    form.client_secret = GOOGLE_CLIENT_SECRET;
    form.redirect_uri = FYB_REDIRECT_URL;
    url = googleOAuthEndpoint;
  }
  else if (provider && provider === 'facebook-oauth2') {
    form.client_id = FACEBOOK_CLIENT_ID;
    form.client_secret = FACEBOOK_CLIENT_SECRET;
    form.redirect_uri = FYB_REDIRECT_URL;
    url = facebookOAuthEndpoint;
  }
  else if (provider && provider === 'twitter-oauth1') {
    form.client_id = TWITTER_CLIENT_ID;
    form.client_secret = TWITTER_CLIENT_SECRET;
    form.redirect_uri = FYB_REDIRECT_URL
    url = twitterOAuthEndpoint;
  }

  exchangeAuthorizationCode(url, form, function(err, accessToken) {
    if (err) {
      return console.log(err);
    }
    else {
      getEmailFromAccessToken(accessToken, function(err, email) {
        if (err) {
          return console.log(err);
        }
        var user = userDb.findOrCreateByEmail(email);
        response.send(user);
      });
    }
  });

});

function getEmailFromAccessToken(accessToken, callback) {
  var url = googleOAuthUserInfoEndpoint + '?access_token=' + accessToken;

  _request.get(url, function(err, httpResponse, body) {
    console.log('response from user info endpoint', body);
    body = JSON.parse(body);

    callback(err, body.email);
  });
}
