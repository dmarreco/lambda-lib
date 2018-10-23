class RemoteException extends Error {
    constructor(message, statusCode, errorCode, fullResponse) {
        super(message || 'Unsuccessful HTTP(S) response');
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.response = fullResponse
        this.name = this.constructor.name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else { 
            this.stack = (new Error(message)).stack; 
        }
    }
}

class ClientException extends RemoteException {}
class ServerException extends RemoteException {}

module.exports = {
    RemoteException,
    ClientException,
    ServerException
};