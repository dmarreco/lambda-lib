const { expect } = require('chai');
const nock = require('nock');
const httpClient = require('../src/client/http-client');
const correlationIds = require('../src/correlation-ids');
const {ClientException, ServerException} = require('../src/client/remote-exceptions');

const _fail = () => {
    return expect(false).to.be(true);
}

describe('HTTP Client', () => {

    before(() => {
        process.env.LOG_LEVEL = 'ERROR';
    });

    it('Making HTTPS GET with result 200 returns the parsed body as object if content-type=application/json' , async () => {
        let jsonResponse = {
            foo: 'foo',
            bar: 1
        };
        nock('https://my.service').get('/foo').reply(200, jsonResponse, {'content-type': 'application/json'});

        let response = await httpClient.makeRequest('GET', 'https://my.service/foo');

        expect(response).to.deep.equal(jsonResponse);
    });

    it('Making HTTPS POST with result 200 returns the body as string if content-type is NOT application/json' , async () => {
        let responseBody = 'hello, cruel and cold world';
        nock('https://my.service').get('/foo').reply(200, responseBody, {'content-type': 'text/plain'});

        let response = await httpClient.makeRequest('GET', 'https://my.service/foo');

        expect(response).to.deep.equal(responseBody);
    });

    it('Making HTTPS GET with result 4XX throws ClientError' , async () => {
        nock('https://my.service').get('/foo').reply(404, {message: 'Entity not found', errorCode: 20}, {'content-type': 'application/json'});

        try { 
            await httpClient.makeRequest('GET', 'https://my.service/foo'); 
        } catch (e) {
            return expect(e instanceof ClientException).to.be.true;
        }
        _fail(); //Should have thrown and never reach this point
    });

    it('Making HTTPS GET with result 5XX throws ServerError' , async () => {
        nock('https://my.service').get('/foo').reply(500, 'Not found', {'content-type': 'text/plain'});

        try { 
            await httpClient.makeRequest('GET', 'https://my.service/foo'); 
        } catch (e) {
            return expect(e instanceof ServerException).to.be.true;
        }
        _fail(); //Should have thrown and never reach this point
    });

    describe('Correlation ID propagation', () => {

        it('When a correlation ID is set in the context, propagate it to outgoing https call', async () => {
            correlationIds.set('x-correlation-id', 'myCorrelationId')
            correlationIds.set('myKey', 'myVal');
            let expectedHeaders = {
                'x-correlation-id': 'myCorrelationId',
                'x-correlation-myKey': 'myVal'
            };

            let actualHeaders = {};
            let mockServer = nock('https://my.host')
                .matchHeader('x-correlation-myKey', (val) => {
                    actualHeaders['x-correlation-myKey'] = val;
                    return true;
                })
                .matchHeader('x-correlation-id', (val) => {
                    actualHeaders['x-correlation-id'] = val;
                    return true;
                })
                .get('/foo')
                .reply(200, {});

            await httpClient.makeRequest('GET', 'https://my.host/foo');

            expect(actualHeaders).to.deep.equal(expectedHeaders);

            mockServer.done();
        });

    });

});