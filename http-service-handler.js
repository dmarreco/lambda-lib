const HandledException = require('./handled-exception');
const log = require('./log');

const HTTP_CODE_SUCCESS = 200;

/**
 * This method handles any business exception by converting it to the proper http response and invoking the proper callback
 * 
 * @param {*} exception The instance of the business exception thrown by the business service lib
 * @param {*} callback The callback function used to send the response to the api channel
 */
const _handleError = (exception, callback) => {
    if(exception instanceof HandledException) {
        log.info('HANDLED CLIENT EXCEPTION RESPONSE (HTTP 4XX)' + exception);

        let response = {
            statusCode: exception.httpStatusCode || 400,
            body: exception.message,
        };

        response.headers = { 'Content-Type': 'application/json' };

        return callback(null, response);
    }
    else {
        log.error('UNHANDLED SERVER ERROR RESPONSE (HTTP 5XX)', {}, exception);

        return callback(exception);
    } 
};

const _handleSuccess = (response, callback) => {
    let response = {
        statusCode: HTTP_CODE_SUCCESS,
        body: JSON.stringify(response),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin' : '*', // Required for CORS support to work
            'Access-Control-Allow-Credentials' : true // Required for cookies, authorization headers with HTTPS
        }
    };
    log.info('SUCCESS SERVICE RESPONSE (HTTP 2XX)', response);
    callback(null, response);
};

class HttpEventHandler {
    handle(_event, callback) {
        this.callback = callback;

        let event = Object.assign({}, _event);
        try {
            event.body = JSON.parse(event.body);
        } catch (e) { /*not json*/ }
        this.event = event;
    }

    withHandler(handler) {
        this.handler = handler;
    }

    withParams(... params) {
        this.params = params;
    }

    async go() {
        try {
            let response = await this.handler(...params);
            _handleSuccess(response, this.callback);
        }
        catch (e) {
            _handleError(e, this.callback);
        }
    }
}

module.exports = HttpEventHandler;



'use strict';

const correlationIds = require('../lib/correlation-ids');

function captureHttp(headers, awsRequestId, sampleDebugLogRate) {
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

  if (headers['Debug-Log-Enabled']) {
    context['Debug-Log-Enabled'] = headers['Debug-Log-Enabled'];
  } else {
    context['Debug-Log-Enabled'] = Math.random() < sampleDebugLogRate ? 'true' : 'false';
  }

  correlationIds.replaceAllWith(context);
}

function isApiGatewayEvent(event) {
  return event.hasOwnProperty('httpMethod')
}

module.exports = (config) => {
  const sampleDebugLogRate = config.sampleDebugLogRate || 0.01;

  return {
    before: (handler, next) => {      
      correlationIds.clearAll();

      if (isApiGatewayEvent(handler.event)) {
        captureHttp(handler.event.headers, handler.context.awsRequestId, sampleDebugLogRate);
      }
      
      next()
    }
  };
};