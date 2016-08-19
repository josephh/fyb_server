'use strict'

var crypto = require('crypto');
var moment = require('moment');
var path = require('path');
var uuid = require('node-uuid');

const _accessKey = process.env.AWS_ACCESS_KEY_ID, _secret = process.env.AWS_SECRET_ACCESS_KEY;
console.log(`id: ${_accessKey}, secret: ${_secret}`);

module.exports = {
  getSignedUrl: function (req, res) {
    const fileName = req.query['file-name'],
      fileType = req.query['file-type'],
      bucket = 'jobbings--fyb',
      uploadKey = `uploads/${uuid.v4()}${path.extname(fileName)}`;

    let expiry = moment().add(10, 'minutes').utc();
    let policy = {
      "expiration": expiry,
      "conditions": [
        {"acl": "public-read" },
        {"bucket": bucket },
        ["starts-with", "$key", uploadKey],
        ['starts-with', '$name', ''],
        ['starts-with', '$Content-Type', '']
      ]
    };
    let encodedPolicy = Buffer(JSON.stringify(policy), 'utf-8').toString('base64');

    const hash = crypto.createHmac('sha1', _secret);
    /**
    Node's 'update' enforces utf-8, in the absence of an 'encoding' method arg
    (The second carriage return with no entry is for the empty Content-MD5, since certain positional parameters
     are expected by Amazon)
    */
    hash.update(encodedPolicy);
    let hmac = hash.digest('base64');

    res.send(
      {
        url: `https://${bucket}.s3.amazonaws.com`,
        credentials: {
          AWSAccessKeyId: _accessKey,
          policy: encodedPolicy,
          signature: hmac,
          acl: 'public-read',
          key: uploadKey
        }
      }
    );

  }
}
