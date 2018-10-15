/*
 * Possible improvements: 
 *  - Sample debug level loging: When in INFO, still debug a percentage of messages for troubleshoot sampling in production.
 *  - Debug messages on error: Buffer all debug messages and flush them in case of error.
 */
const correlationIds = require('./correlation-ids');

const DEFAULT_LOG_LEVEL = 'DEBUG';

const LogLevels = {
    DEBUG : 0,
    INFO  : 1,
    WARN  : 2,
    ERROR : 3
};

const DEFAULT_CONTEXT = {
    awsRegion: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION,
    lambdaName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    lambdaVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
    functionMemorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
    stage: process.env.ENVIRONMENT || process.env.STAGE
};

function getContext() {
    const context = correlationIds.get();
    if(context) {
        return Object.assign({}, DEFAULT_CONTEXT, context);
    }
    return DEFAULT_CONTEXT;
}

function isEnabled (level) {
    return level >= LogLevels[process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL];
}

function appendError(params, err) {
    if (!err) {
        return params;
    }

    return Object.assign(
        params || { }, 
        { errorName: err.name, errorMessage: err.message, stackTrace: err.stack }
    );
}

function log (levelName, message, params) {
    if (!isEnabled(LogLevels[levelName])) {
        return;
    }

    let context = getContext();

    let logMsg = Object.assign({message}, context, params);
    logMsg.level = levelName;

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logMsg) + '\n');
}

module.exports.debug = (msg, params) => log('DEBUG', msg, params);
module.exports.info  = (msg, params) => log('INFO',  msg, params);
module.exports.warn  = (msg, params, error) => log('WARN',  msg, appendError(params, error));
module.exports.error = (msg, params, error) => log('ERROR', msg, appendError(params, error));