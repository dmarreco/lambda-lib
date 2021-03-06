const httpClient = require('./http-client');
const kinesisClient = require('./kinesis-client');
const snsClient = require('./sns-client');
const RemoteExceptions = require('./remote-exceptions');

module.exports = {
    httpClient,
    kinesisClient,
    snsClient,
    RemoteException: RemoteExceptions.RemoteException,
    ClientException: RemoteExceptions.ClientException,
    ServerException: RemoteExceptions.ServerException
};