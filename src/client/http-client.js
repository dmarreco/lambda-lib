//Enable outgoing http call instrumentation via AWS XRAY. see http://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-httpclients.html .
const aws4 = require('aws4');
const url = require('url');
const correlationIds = require('../correlation-ids');
const log = require('../log');
const {ClientException, ServerException} = require('./remote-exceptions')
let _libsXRay, _libs;

const DEFAULT_PROTOCOL = 'HTTPS';

exports.makeRequest = async function(method, url, body, protocol) {
    let bodyAsString;
    if (body && body instanceof Object) {
        bodyAsString = JSON.stringify(body);
    } else if (body) {
        bodyAsString = body.toString();
    }
    let lib = _getProperLibraryForProtocol(protocol);
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
                if(response.statusCode < 500) {
                    throw new ClientException(message, response.statusCode, errorCode);
                } else {
                    throw new ServerException(message, response.statusCode, errorCode);
                }
            }

            let contentType = response.headers && (response.headers['content-type'] || reponse.headers['Content-Type']);

            if(contentType && contentType.toLowerCase() === 'application/json') {
                return JSON.parse(response.body);
            }
            else {
                return response.body;
            }
        });
}; 

function _getProperLibraryForProtocol(protocol) {
    let libs;
    if(process.env.ENABLE_XRAY == 'true') {
        const AWSXRay = require('aws-xray-sdk');
        if(!_libsXray) { //lazy load
            _libsXray = {
                'HTTP' : AWSXRay.captureHTTPs(require('http')),
                'HTTPS': AWSXRay.captureHTTPs(require('https'))
            };
        }
        libs = _libsXRay;
    } else {
        if(!_libs) {
            _libs = { // lazy load
                'HTTP' : require('http'),
                'HTTPS': require('https')
            };
        }
        libs = _libs;
    }
    let res = libs[protocol || DEFAULT_PROTOCOL];
    if(!res) {
        throw new Error (`Protocol must be either "HTTP" or "HTTPS", but was "${protocol}"`);
    }
    return res;
}

function _makeRequest(method, urlString, body, protocol) {
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
        body,
        headers: correlationIds.get()
    };

    log.debug('HTTP REQUEST', opts);
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
    response.on('end', () => resolve({statusCode: response.statusCode, body: responseBody, headers: response.headers}));
}