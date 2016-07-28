var AWS = require('aws-sdk');
var uuid = require('node-uuid');

AWS.config.region = 'eu-west-1';
AWS.config.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
AWS.config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

module.exports = {
  getSignedUrl: function (req, res) {
      var s3 = new AWS.S3();
      var params = {Bucket: 'jobbings.fyb', Key: req.query.key + uuid.v4() /* expires after 15 mins by default */};
      s3.getSignedUrl('putObject', params, function (err, url) {
        console.log("The URL is", url);
        res.send({signedUrl: url});
      });
  }
}
