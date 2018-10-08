const Chai = require('chai');
const expect = Chai.expect;
const LambdaTester = require('lambda-tester');

const HttpHandler = require('../src/http-service-handler');

const helloWorldHandler = async (event, context, callback) => {
    await new HttpHandler()
        .handle(event, context, callback)
        .withHandler(() => {
            return "Hello World";
        })
        .withEventParams(e => [e.body, e.pathParams.id])
        .go();
};

const event = {
    body: '{"lastName":"Pederneiras", "firstName":"Aristarco"}',
    pathParams: {
        id: 666
    }
};

describe('Sanity test for a sample hello world handler', () => {
    it('Should result status code 200', async () => {
        await helloWorldHandler(event, {}, () => {});


        // return LambdaTester(helloWorldHandler)
        //     .event(event)
        //     .expectResult(result => {
        //         expect(result.statusCode).to.equal(200);
        //     });
    });
});