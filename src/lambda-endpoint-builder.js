const HandledException = require('./handled-exception');
const middy = require('@middy/core');
const httpJsonBodyParser = require('@middy/http-json-body-parser');
const { captureCorrelationIds, sampleLogging } = require('./middleware');

const DEFAULT_SAMPLE_DEBUG_LOG_RATE = 0.05;
const HTTP_CODE_SUCCESS = 200;

//TODO o wrapper pode ser implementado como um middleware middy
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
//TODO deprecar essa Builder Class e usar somente o wrapper
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
            
            if (event.body == null) event.body = {};
            if (event.pathParameters == null) event.pathParameters = {};
            if (event.queryStringParameters == null) event.queryStringParameters = {};

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

        const disableSampleLogging = (process.env.DISABLE_SAMPLE_DEBUG_LOG === 'true');

        return middy(res)
            .use(httpJsonBodyParser())
            .use(captureCorrelationIds({ sampleDebugLogRate: DEFAULT_SAMPLE_DEBUG_LOG_RATE }))
            .use(sampleLogging({ sampleRate: DEFAULT_SAMPLE_DEBUG_LOG_RATE, forceDisable: disableSampleLogging }));
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
        //TODO de acordo com a nova spec do lambda, não é mais necessário chamar callback, podendo somente retornar o resultado.
        callback(null, response);
    }
    else {
        //TODO de acordo com a nova spec do lambda, não é mais necessário chamar callback, podendo somente lançar a exception.
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

    //TODO de acordo com a nova spec do lambda, não é mais necessário chamar callback, podendo somente retornar o resultado.
    callback(null, response);
}

