//Enable outgoing http call instrumentation via AWS XRAY. see http://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs-httpclients.html .
const aws4 = require('aws4');
const url = require('url');
const correlationIds = require('../correlation-ids');
const log = require('../log');
const {ClientException, ServerException} = require('./remote-exceptions');
let _libsXRay, _libs;

/**
 * Makes an HTTP request to a remote API
 * 
 * @param verb An HTTP verb (i.e., 'GET', 'POST', 'PUT', 'PATCH', ...)
 * @param url The complete resource URL (i.e., 'https://my.host/a/path')
 * @param body The request body
 * @param headers Headers to be included in the request. Some extra headers may be added by this module as needed
 * @param signAws If the request should be signed with AWS credential from the executing role. Set to true if you are calling another lambda API.
 * 
 * @returns The parsed response body, if response code is 2XX content-type=application/json; or the raw body otherwise
 * @throws {ClientException} If response status code is 4XX. The status code and message will be in the thrown exception.
 * @throws {ServerException} If response status code is 5XX. The status code and message will be in the thrown exception.
 */
exports.request = _request;

/**
 * Makes an HTTP request to a remote API, signed by the executor AWS role
 * 
 * @param verb An HTTP verb (i.e., 'GET', 'POST', 'PUT', 'PATCH', ...)
 * @param url The complete resource URL (i.e., 'https://my.host/a/path')
 * @param body The request body
 * @param headers Headers to be included in the request. Some extra headers may be added by this module as needed
 * 
 * @returns The parsed response body, if response code is 2XX content-type=application/json; or the raw body otherwise
 * @throws {ClientException} If response status code is 4XX. The status code and message will be in the thrown exception.
 * @throws {ServerException} If response status code is 5XX. The status code and message will be in the thrown exception.
 */
exports.awsRequest = async (verb, url, body, headers) => {return _request(verb, url, body, headers, true);};


async function _request (verb, url, body, headers, signAws) {
    if (! (verb && url) ) {
        throw new Error ('"verb" and "url" must be informed');
    }

    let bodyAsString;
    let requestHeaders = Object.assign({}, headers);
    if (body && body instanceof Object) {
        bodyAsString = JSON.stringify(body);
        requestHeaders['content-type'] = requestHeaders['content-type'] || 'application/json';
    } else if (body) {
        bodyAsString = body.toString();
    }
    let response = await _makeRequest(verb, url, (body ? bodyAsString : undefined), requestHeaders, signAws);
    if (response.statusCode >= 400) {
        let errorCode, message;
        try {
            let body = JSON.parse(response.body);
            errorCode = body.errorCode; //errorCode may be passed, on top of http status code for typed error contract
            message = body.message;
        }
        catch(err) { //not JSON
            message = response.body;
        }
        if(response.statusCode < 500) {
            throw new ClientException(message, response.statusCode, errorCode, response);
        } else {
            throw new ServerException(message, response.statusCode, errorCode, response);
        }
    }
    let contentType = response.headers && (response.headers['content-type'] || response.headers['Content-Type']);

    if(contentType && contentType.toLowerCase().startsWith('application/json')) {
        return JSON.parse(response.body);
    }
    else {
        return response.body;
    }
}


async function _makeRequest(method, urlString, body, headers, signAws) {
    // create a new Promise
    return new Promise((resolve, reject) => {

        /* Node's URL library allows us to create a
            * URL object from our request string, so we can build
            * our request for http.get */
        let urlStringWithoutDuplicateSlashesFromPath = urlString.replace(/([^:]\/)\/+/g, '$1');
        const parsedUrl = url.parse(encodeURI(urlStringWithoutDuplicateSlashesFromPath));

        const requestOptions = _createOptions(method, parsedUrl, body, headers, signAws);
        
        const lib = _getProperLibraryForProtocol(parsedUrl.protocol);

        const request = lib.request(requestOptions, res => _onResponse(res, resolve, reject));

        /* if there's an error, then reject the Promise
            * (can be handled with Promise.prototype.catch) */
        request.on('error', reject);
        if(requestOptions.body) {
            request.write(requestOptions.body);
        }

        request.end();
    })
        .then(result => {
            log.debug('HTTP response', result);
            return result;
        });
}

function _getProperLibraryForProtocol(protocol) {
    const DEFAULT_PROTOCOL = 'https:';
    let libs;
    if( !(process.env.DISABLE_XRAY == 'true') ) {
        const AWSXRay = require('aws-xray-sdk');
        if(!_libsXRay) { //lazy load
            _libsXRay = {
                'http:' : AWSXRay.captureHTTPs(require('http')),
                'https:': AWSXRay.captureHTTPs(require('https'))
            };
        }
        libs = _libsXRay;
    } else {
        if(!_libs) {
            _libs = { // lazy load
                'http:' : require('http'),
                'https:': require('https')
            };
        }
        libs = _libs;
    }
    let res = libs[protocol || DEFAULT_PROTOCOL];
    if(!res) throw new Error(`Could not find handler library for protocol '${protocol}'; must be either 'http:' 'https:'`);
    return res;
}

// the options that are required by http.get
function  _createOptions(method, url, body, _headers, signAws) {
    let headers = Object.assign({}, correlationIds.get(), _headers);
    let opts =  {
        hostname: url.hostname,
        path: url.path,
        port: url.port,
        method,
        body,
        headers
    };
    log.debug('HTTP request', opts);
    if (signAws) {
        aws4.sign(opts);
        log.debug('(HTTP request is IAM-signed)');
    }
    return opts;
}

/* once http.get returns a response, build it and 
 * resolve or reject the Promise 
 */
function _onResponse(response, resolve, reject) {
    const hasResponseFailed = response.status >= 400;
    var responseBody = '';

    if (hasResponseFailed) {
        reject(`Request to ${response.url} failed with HTTP status ${response.status}`);
    }

    /* the response stream's (an instance of Stream) current data. See:
        * https://nodejs.org/api/stream.html#stream_event_data */
    response.on('data', chunk => responseBody += chunk.toString());

    // once all the data has been read, resolve the Promise 
    response.on('end', () => resolve({statusCode: response.statusCode, body: responseBody, headers: response.headers}));
}