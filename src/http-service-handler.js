const HandledException = require('./handled-exception');
const log = require('./log');
const correlationIds = require('./correlation-ids');

const HTTP_CODE_SUCCESS = 200;

/**
 * Handler for HTTP lambda endpoints.
 * 
 * Usage Ex.:
 *   await new HttpEventHandler()
 *     .handle(event, context, callback)
 *     .withHandler(myBusinesService.doSome)
 *     .withParams(JSON.parse(event.body), event.pathParams.id)
 *     // or, alternativelly:
 *     // .withEventParams(e => [e.body, e.pathParams.id])
 *     .go();
 */
class HttpEventHandler {
    handle(_event, context, callback) {
        this.callback = callback;
        this.context = context;

        let event = Object.assign({}, _event);
        try {
            event.body = JSON.parse(event.body);
        } catch (e) { /*not json*/ }
        this.event = event;

        return this;
    }

    withHandler(handler) {
        this.handler = handler;
        return this;
    }

    withEventParams(f) {
        this.params = f(this.event);
        return this;
    }

    withParams(...params) {
        this.params = params;
        return this;
    }

    async go() {
        try {
            log.info('EVENT RECEIVED', this.event);
            _captureCorrelationId(this.event.headers, this.context.awsRequestId);
            let response = await this.handler(...this.params);
            _handleSuccess(response, this.callback);
        }
        catch (e) {
            _handleError(e, this.callback);
        }
    }
}

function _handler(event, context, callback) {
    
}

module.exports = HttpEventHandler;

/**
 * This method handles any business exception by converting it to the proper http response and invoking the proper callback
 * 
 * @param {*} exception The instance of the business exception thrown by the business service lib
 * @param {*} callback The callback function used to send the response to the api channel
 */
function _handleError(exception, callback) {
    if (exception instanceof HandledException) {
        log.info('HANDLED CLIENT/BUSINESS EXCEPTION RESPONSE (HTTP 4XX)' + exception);

        let response = {
            statusCode: exception.httpStatusCode || 400,
            body: exception.message,
        };

        response.headers = { 'Content-Type': 'application/json' };

        callback(null, response);
    }
    else {
        log.error('UNHANDLED SERVER ERROR RESPONSE (HTTP 5XX)', {}, exception);

        callback(exception);
    }
}

function _handleSuccess(responseBody, callback) {
    let response = {
        statusCode: HTTP_CODE_SUCCESS,
        body: JSON.stringify(responseBody),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', // Required for CORS support to work
            'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
        }
    };
    log.info('SUCCESS SERVICE RESPONSE (HTTP 2XX)', response);
    callback(null, response);
}

function _captureCorrelationId(headers, awsRequestId) {
    if (!headers) {
        log.warn(`Request ${awsRequestId} is missing headers`);
        return;
    }

    let context = { awsRequestId };
    for (const header in headers) {
        if (header.toLowerCase().startsWith('x-correlation-')) {
            context[header] = headers[header];
        }
    }

    if (!context['x-correlation-id']) {
        context['x-correlation-id'] = awsRequestId;
    }

    // forward the original User-Agent on
    if (headers['User-Agent']) {
        context['User-Agent'] = headers['User-Agent'];
    }

    correlationIds.replaceAllWith(context);
}
