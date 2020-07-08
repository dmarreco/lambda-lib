const HandledException = require('./handled-exception');
const middy = require('@middy/core');
const { captureCorrelationIds, sampleLogging } = require('./middleware');
const log = require('./log');

const SAMPLE_DEBUG_LOG = 0.05;
const HTTP_CODE_SUCCESS = 200;

const LambdaEndpointWrapper = (f) => {
    return new LambdaEndpoint()
        .withHandler(f)
        .build();
};

/**
 * Handler for HTTP lambda endpoints.
 * 
 * Usage Ex.:
 * 
 * myLambdaModule.myLambdaHandler = new LambdaEndpoint()
 *      .withHandler(myServiceModule.someBusinessHandler)
 *      .withStaticParams('myParam1', myParam2)
 *      // or, alternativelly:
 *      // .withEventParams(e => [e.body.some, e.queryStringParams.someOther]) 
 *      .build();
 */
class LambdaEndpoint {

    withHandler(handler) {
        this.handler = handler;
        return this;
    }

    withEventParams(eventToParamsMapperFunction) {
        this.eventToParamsMapperFunction = eventToParamsMapperFunction;
        return this;
    }

    withStaticParams(...params) {
        this.params = params;
        return this;
    }

    withEventValidator(f) {
        this.validateEvent = f;
        return this;
    }

    build() {
        if (this.params && this.eventToParamsMapperFunction) {
            throw new Error('Error building lambda handler module: must use either "withParams(...params)" or "withEventParams(mapperFunc)", not both');
        }
        if(!this.handler) {
            throw new Error('Must define an underlying function using "withHandler(<handlerFunction>)" before calling "build()');
        }

        let res = async (_event, context, callback) => {
            let event = Object.assign({}, _event);
            if(event.body === undefined) event.body = '{}';
            try { event.body = JSON.parse(event.body); } catch (e) { /*not json*/ }
            event.pathParameters = event.pathParameters || {};
            event.queryStringParameters = event.queryStringParameters || {};

            if (this.validateEvent) this.validateEvent(event);

            let params;
            if (this.params) {
                params = this.params;
            } else if (this.eventToParamsMapperFunction) {
                params = this.eventToParamsMapperFunction(event);
            } else {
                params = [event, context, callback];
            }
            if (!Array.isArray(params)) {
                params = [params]; //forces conversion to array
            }

            try {
                let response = await this.handler(...params);
                _handleSuccess(response, callback);
            }
            catch (e) {
                _handleError(e, callback);
            }
        };

        return middy(res)
            .use(captureCorrelationIds({ sampleDebugLogRate: SAMPLE_DEBUG_LOG }))
            .use(sampleLogging({ sampleRate: SAMPLE_DEBUG_LOG }));
    }
}

LambdaEndpoint.Wrap = LambdaEndpointWrapper;

module.exports = LambdaEndpoint;

/**
 * This method handles any business exception by converting it to the proper http response and invoking the proper callback
 * 
 * @param {*} exception The instance of the business exception thrown by the business service lib
 * @param {*} callback The callback function used to send the response to the api channel
 */
function _handleError(exception, callback) {
    if (exception instanceof HandledException) {
        let response = {
            statusCode: exception.statusCode || exception.httpStatusCode || 400,
            body: exception.message,
        };
        response.headers = { 'Content-Type': 'text/plain' };
        callback(null, response);
    }
    else {
        callback(exception);
    }
}

function _handleSuccess(responseBody, callback) {

    let isObject = (responseBody !== null) && (typeof responseBody === 'object');

    let response = {
        statusCode: HTTP_CODE_SUCCESS,
        headers: {
            'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
        }
    };

    if (isObject) {
        response.body = JSON.stringify(responseBody);
        response.headers['content-type'] = 'application/json';
    } else {
        response.body = responseBody;
        response.headers['content-type'] = 'text/plain';
    }

    log.info('LAMBDA RESPONSE', response);

    callback(null, response);
}

