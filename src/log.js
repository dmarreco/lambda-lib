'use strict';

const correlationIds = require('./correlation-ids');

const LogLevels = {
    DEBUG : 0,
    INFO  : 1,
    WARN  : 2,
    ERROR : 3
};

const DEFAULT_LOG_LEVEL = 'DEBUG';

// most of these are available through the Node.js execution environment for Lambda
// see https://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html
const DEFAULT_CONTEXT = {
    awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
    functionMemorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
    stage: process.env.ENVIRONMENT || process.env.STAGE
};

function getContext () {
    // if there's a global variable for all the current request context then use it
    const context = correlationIds.get();
    if (context) {
    // note: this is a shallow copy, which is ok as we're not going to mutate anything
        return Object.assign({}, DEFAULT_CONTEXT, context);
    }

    return DEFAULT_CONTEXT;
}

function logLevelName() {
    return process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL;
}

function isEnabled (level) {
    return level >= LogLevels[logLevelName()];
}

function appendError(params, err) {
    if (!err) {
        return params;
    }

    let stackAsArray = err && err.stack && err.stack.split(/\r?\n/);

    return Object.assign(
        {},
        params || {}, 
        { errorName: err.name, errorMessage: err.message, stackTrace: stackAsArray, errorAsString: err.toString() }
    );
}

function log (levelName, message, params, printFunc = console.log) {
    if (!isEnabled(LogLevels[levelName])) {
        return;
    }

    let context = getContext();
    let logMsg = Object.assign({
        message,
        level: levelName
    }, context, {params});

    //eslint-disable-next-line no-console
    printFunc(JSON.stringify(logMsg));
}

module.exports.debug = (msg, params) => log('DEBUG', msg, params, console.debug);
module.exports.info  = (msg, params) => log('INFO',  msg, params, console.info);
module.exports.warn  = (msg, params, error) => log('WARN',  msg, appendError(params, error), console.warn);
module.exports.error = (msg, params, error) => log('ERROR', msg, appendError(params, error), console.error);

module.exports.enableDebug = () => {
    const oldLevel = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'DEBUG';

    // return a function to perform the rollback
    return () => {
        process.env.LOG_LEVEL = oldLevel;
    };
};