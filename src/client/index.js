const httpClient = require('./http-client');
const kinesisClient = require('./kinesis-client');
const snsClient = require('./sns-client');

module.exports = {
    httpClient,
    kinesisClient,
    snsClient
};