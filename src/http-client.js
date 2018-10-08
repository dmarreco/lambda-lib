//Enable outgoing http call instrumentation via AWS XRAY. see http://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-httpclients.html .
const AWSXRay = require('aws-xray-sdk');
const libs = {
    'HTTP' : AWSXRay.captureHTTPs(require('https')),
    'HTTPS': AWSXRay.captureHTTPs(require('http'))
};
const aws4 = require('aws4');
const url = require('url');
const log = require('./log');

const DEFAULT_PROTOCOL = 'HTTPS';

exports.makeRequest = function(method, url, body, protocol) {
    let lib = libs[protocol || DEFAULT_PROTOCOL];
    if(!lib) throw new Error (`Protocol must be either "HTTP" or "HTTPS", but was "${protocol}"`);

    let bodyAsString;
    if (body && body instanceof Object) {
        bodyAsString = JSON.stringify(body);
    } else if (body) {
        bodyAsString = body.toString();
    }
    return _makeRequest(method, url, (body ? bodyAsString : undefined), lib)
        .then(response => {
            if (response.statusCode >= 400) {
                let errorCode, message;
                try {
                    let body = JSON.parse(response.body);
                    errorCode = body.errorCode;
                    message = body.message;
                }
                catch(err) { //not JSON
                    message = response.body;
                }
                throw new RemoteError(message, response.statusCode, errorCode);
            }
            return JSON.parse(response.body);
        });
}; 

exports.httpsGet = function(url) {
    return _makeRequest('GET', url);
};

class RemoteError extends Error {
    constructor(message, httpStatusCode, errorCode) {
        super(`${message} - HTTP STATUS CODE ${httpStatusCode} - ERROR CODE ${errorCode}`);
        this.httpStatusCode = httpStatusCode;
        this.errorCode = errorCode;
        this.name = this.constructor.name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else { 
            this.stack = (new Error(message)).stack; 
        }
    }
}
exports.RemoteError = RemoteError;


function _makeRequest(method, urlString, body, protocol) {
    log.debug(`HTTP REQUEST (${method}) => ${urlString}`, body);
    // create a new Promise
    return new Promise((resolve, reject) => {

        /* Node's URL library allows us to create a
            * URL object from our request string, so we can build
            * our request for http.get */
        const parsedUrl = url.parse(encodeURI(urlString));

        const requestOptions = _createOptions(method, parsedUrl, body);

        const request = protocol.request(requestOptions, res => _onResponse(res, resolve, reject));

        /* if there's an error, then reject the Promise
            * (can be handled with Promise.prototype.catch) */
        request.on('error', reject);
        if(requestOptions.body) {
            request.write(requestOptions.body);
        }

        request.end();
    })
        .then(result => {
            log.debug('HTTP RESPONSE', result);
            return result;
        });
}

// the options that are required by http.get
function  _createOptions(method, url, body) {
    let opts =  {
        hostname: url.hostname,
        path: url.path,
        port: url.port,
        method,
        body: body
    };
    aws4.sign(opts);
    return opts;
}

/* once http.get returns a response, build it and 
 * resolve or reject the Promise 
 */
function _onResponse(response, resolve, reject) {
    const hasResponseFailed = response.status >= 400;
    var responseBody = '';

    if (hasResponseFailed) {
        reject(`Request to ${response.url} failed with HTTP ${response.status}`);
    }

    /* the response stream's (an instance of Stream) current data. See:
        * https://nodejs.org/api/stream.html#stream_event_data */
    response.on('data', chunk => responseBody += chunk.toString());

    // once all the data has been read, resolve the Promise 
    response.on('end', () => resolve({statusCode: response.statusCode, body: responseBody}));
}