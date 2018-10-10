const Chai = require('chai');
const expect = Chai.expect;
const LambdaTester = require('lambda-tester');

const HttpHandler = require('../src/http-service-handler');

describe('Handle an event with a sample handler that returns its parameters', () => {
    it('Should result status code 200 and return an object with the parameters resolved from the event', async () => {

        const mergeParamsHandler = async (event, context, callback) => {
            await new HttpHandler()
                .handle(event, context, callback)
                .withHandler((body, id) => {
                    return Object.assign({}, body, id)
                })
                .withEventParams(e => [e.body, e.pathParams.id])
                .go();
        };

        const event = {
            body: '{"lastName":"Pederneiras", "firstName":"Aristarco"}',
            pathParams: {
                id: 666
            },
            headers: {
                'x-correlation-id': 'aCorrelationId'
            }
        };

        return LambdaTester(mergeParamsHandler)
            .event(event)
            .expectResult(result => {
                expect(result.statusCode).to.equal(200);
            });
    });
});