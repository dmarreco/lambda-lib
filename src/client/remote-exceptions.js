class RemoteException extends Error {
    constructor(message, httpStatusCode, errorCode) {
        super(`${message} - HTTP STATUS CODE ${httpStatusCode} - ERROR CODE ${errorCode}`);
        this.httpStatusCode = httpStatusCode;
        this.errorCode = errorCode;
        this.name = this.constructor.name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else { 
            this.stack = (new Error(message)).stack; 
        }
    }
}

class ClientException extends RemoteException {};
class ServerException extends RemoteException {};

module.exports = {
    RemoteException,
    ClientException,
    ServerException
};