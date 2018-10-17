const HandledException = require('./handled-exception');
const log = require('./log');
const middy = require('middy');
const { captureCorrelationIds, sampleLogging } = require('./middleware');

const HTTP_CODE_SUCCESS = 200;

/**
 * Handler for HTTP lambda endpoints.
 * 
 * Usage Ex.:
 * 
 * myLambdaModule.myLambdaHandler = new EventHandlerBuilder()
 *      .withHandler(myServiceModule.someBusinessHandler)
 *      .withStaticParams('myParam1', myParam2)
 *      // or, alternativelly:
 *      // .withEventParams(e => [e.body.some, e.queryStringParams.someOther]) 
 *      .build();
 */
class LambdaHandlerBuilder {

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

    build() {
        if (this.params && this.eventToParamsMapperFunction) {
            throw new Error('Error building lambda handler module: must use either "withParams(...params)" or "withEventParams(mapperFunc)", not both');
        }
        if(!this.handler) {
            throw new Error('Must define an underlying function using "withHandler(<handlerFunction>)" before calling "build()');
        }

        let res = async (_event, context, callback) => {
            let event = Object.assign({}, _event);
            try { event.body = JSON.parse(event.body); } catch (e) { /*not json*/ }

            let params;
            if (this.params) {
                params = this.params;
            } else if (this.eventToParamsMapperFunction) {
                params = this.eventToParamsMapperFunction(event);
            } else {
                params = [];
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
            .use(captureCorrelationIds({ sampleDebugLogRate: 0.01 }))
            .use(sampleLogging({ sampleRate: 0.01 }));
    }
}

module.exports = LambdaHandlerBuilder;

/**
 * This method handles any business exception by converting it to the proper http response and invoking the proper callback
 * 
 * @param {*} exception The instance of the business exception thrown by the business service lib
 * @param {*} callback The callback function used to send the response to the api channel
 */
function _handleError(exception, callback) {
    if (exception instanceof HandledException) {
        let response = {
            statusCode: exception.httpStatusCode || 400,
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
    let response = {
        statusCode: HTTP_CODE_SUCCESS,
        body: JSON.stringify(responseBody),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Credentials': true // Required for cookies, authorization headers with HTTPS
        }
    };
    callback(null, response);
}
