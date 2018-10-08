class HandledException extends Error {

    constructor(customMessage, errorCode, defaultMessage, httpStatusCode) {
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