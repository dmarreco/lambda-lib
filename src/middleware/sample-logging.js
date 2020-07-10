const correlationIds = require('../correlation-ids');
const log = require('../log');

// config should be { sampleRate: double } where sampleRate is between 0.0-1.0
module.exports = (config) => {
    let rollback = undefined;

    const isDebugEnabled = () => {
        const context = correlationIds.get();
        if (context && context['Debug-Log-Enabled'] === 'true') {
            return true;
        }

        return config.sampleRate && Math.random() <= config.sampleRate;
    };

    return {
        before: (handler, next) => {
            log.info('LAMBDA START');
            log.debug('LAMBDA EVENT RECEIVED', handler.event);

            if (isDebugEnabled()) {
                rollback = log.enableDebug();
            }

            next();
        },
        after: (handler, next) => {
            log.debug('LAMBDA RESPONSE', handler.response);
            log.info('LAMBDA FINISH');

            if (rollback) {
                rollback();
            }

            next();
        },
        onError: (handler, next) => {
            let awsRequestId = handler.context.awsRequestId;
            let invocationEvent = JSON.stringify(handler.event);
            log.error('LAMBDA INVOCATION FAILED', { awsRequestId, invocationEvent }, handler.error);

            next(handler.error);
        }
    };
};