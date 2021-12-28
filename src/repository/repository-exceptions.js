class RepositoryException {

    constructor(customMessage, errorCode, defaultMessage, httpStatusCode) {
        this.isJson = (errorCode ? true : false);
        this.httpStatusCode = httpStatusCode;
        this.name = this.constructor.name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else { 
            this.stack = (new Error(customMessage || defaultMessage)).stack; 
        }
    }

}

class BusinessRuleViolationException extends RepositoryException {
    constructor(message, errorCode) { super(message, errorCode, 'The provided entity could not be updated as it would violate one or more validation rules', 400); }
}

class InvalidPaymentMethodException extends RepositoryException {
    constructor(message, errorCode){ super(message, errorCode, 'Payment denied', 402); }
}

class NoEntityFoundException extends RepositoryException {
    constructor(message, errorCode){ super(message, errorCode, 'No entity with the given id currently exists', 404); }
}

class OptimisticLockException extends RepositoryException {
    constructor(message, errorCode){ super(message, errorCode, 'This entity has already been updated by another process', 409); }
}

class ParameterMissingException extends RepositoryException {
    constructor(message, errorCode){ super(message, errorCode, 'A required parameter is missing in the request', 412); }
}

class InvalidEntityException extends RepositoryException {
    constructor(message, errorCode) { super(message, errorCode, 'The provided entity is malformed or missing required attributes', 422); }
}
class InvalidParametersException extends RepositoryException {
    constructor(message, errorCode) { super(message, errorCode, 'The provided paremeters are invalid', 422); }
}

class UnidentifiedEntityException extends RepositoryException {
    constructor(message, errorCode) { super(message, errorCode, 'Updated entity must provide valid UUID and VERSION', 428); }
}

module.exports = {
    RepositoryException,

    InvalidPaymentMethodException,
    UnidentifiedEntityException,
    OptimisticLockException,
    NoEntityFoundException,
    ParameterMissingException,
    InvalidEntityException,
    InvalidParametersException,
    BusinessRuleViolationException
};