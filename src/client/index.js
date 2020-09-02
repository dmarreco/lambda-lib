const httpClient = require('./http-client');
const snsClient = require('./sns-client');
const RemoteExceptions = require('./remote-exceptions');

module.exports = {
    httpClient,
    snsClient,
    RemoteException: RemoteExceptions.RemoteException,
    ClientException: RemoteExceptions.ClientException,
    ServerException: RemoteExceptions.ServerException
};