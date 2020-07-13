//TODO deprecar e substituir por https://github.com/middyjs/middy/tree/master/packages/http-error-handler
class HandledException extends Error {

    constructor(customMessage, httpStatusCode, errorCode, defaultMessage) {
        super(_getMessage(customMessage, errorCode, defaultMessage));
        this.isJson = (errorCode ? true : false);
        this.httpStatusCode = httpStatusCode;
        this.name = this.constructor.name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else { 
            this.stack = (new Error(_getMessage(customMessage, errorCode, defaultMessage))).stack; 
        }
    }

}

function _getMessage(customMessage, errorCode, defaultMessage) {
    if (errorCode) {
        return JSON.stringify({
            errorCode: errorCode,
            message: customMessage || defaultMessage
        });
    } else {
        return customMessage || defaultMessage;
    }
}

module.exports = HandledException;