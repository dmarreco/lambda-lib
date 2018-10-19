const httpClient = require('./http-client');
const kinesisClient = require('./kinesis-client');
const snsClient = require('./sns-client');
const RemoteExceptions = require('./remote-exception');

module.exports = {
    httpClient,
    kinesisClient,
    snsClient,
    RemoteExceptions
};