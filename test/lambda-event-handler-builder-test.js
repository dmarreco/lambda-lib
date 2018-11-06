const Chai = require('chai');
const expect = Chai.expect;
const LambdaTester = require('lambda-tester');
const correlationIds = require('../src/correlation-ids');

const HandledException = require('../src/handled-exception');

const LambdaHandler = require('../src/lambda-endpoint-builder');

before(() => {
    process.env.LOG_LEVEL = 'ERROR';
});

describe('Http event handler wrapper', () => {
    it('If event has no body, pathParameters or queryStringParameters defined, trying to access its properties should not result exception', () => {
        const event = {};

        const mergeParamsHandler = LambdaHandler.Wrap((event, context, callback) => {
            let eventBodyProp = event.body.prop;
            let pathParametersProp = event.pathParameters.prop2;
            let queryStringParametersProp = event.queryStringParameters.prop3;
            if (eventBodyProp === undefined && pathParametersProp === undefined && queryStringParametersProp === undefined) {
                return 'all is undefined, but no exception thown, as expected';
            }
        });

        return LambdaTester(mergeParamsHandler)
            .event(event)
            .expectResult(result => {
                expect(result.body).to.equal('all is undefined, but no exception thown, as expected');
            });
    });


    it('Creating a lambda event handler for a simple function should result status code 200 and the function result as body', () => {
        const myUpdateObjectService = (object, id) => {
            return Object.assign({}, object, {id})
        }

        const mergeParamsHandler = LambdaHandler.Wrap((event, context, callback) => {
            let obj = event.body;
            let id = event.pathParameters.id;
            return myUpdateObjectService(obj, id);
        });

        const event = {
            body: '{"lastName":"Pederneiras", "firstName":"Aristarco"}',
            pathParameters: {
                id: 666
            }
        };

        const expectedResultBody = {
            lastName: "Pederneiras",
            firstName: "Aristarco",
            id: 666
        };

        return LambdaTester(mergeParamsHandler)
            .event(event)
            .expectResult(result => {
                expect(result.statusCode).to.equal(200);
                expect(JSON.parse(result.body)).to.deep.equal(expectedResultBody);
            });
    });
});

describe('Http event handler builder', () => {

    it('Creating a lambda event handler for a simple function should result status code 200 and the function result as body', () => {
        const myUpdateObjectService = (object, id) => {
            return Object.assign({}, object, {id})
        }

        const mergeParamsHandler = new LambdaHandler()
            .withHandler(myUpdateObjectService)
            .withEventParams(e => [e.body, e.pathParams.id])
            .build();

        const event = {
            body: '{"lastName":"Pederneiras", "firstName":"Aristarco"}',
            pathParams: {
                id: 666
            }
        };

        const expectedResultBody = {
            lastName: "Pederneiras",
            firstName: "Aristarco",
            id: 666
        };

        return LambdaTester(mergeParamsHandler)
            .event(event)
            .expectResult(result => {
                expect(result.statusCode).to.equal(200);
                expect(JSON.parse(result.body)).to.deep.equal(expectedResultBody);
            });
    });

    it('If the underlying handler function throws a generic _unhandled_ exception, should fail lambda execution', () => {
        const errorMessage = 'Damn!';
        const myErrorThrowerService = () => {
            throw new Error(errorMessage);
        }

        const myErrorThrowerHandler = new LambdaHandler()
            .withHandler(myErrorThrowerService)
            .build();

        return LambdaTester(myErrorThrowerHandler)
            .event({})
            .expectError(result => {
                expect(result).to.be.an('Error');
                expect(result.message).to.equal(errorMessage);
            });
    });

    it('If the underlying handler function throws a _handled_ exception, should fail with the exception\'s status code', () => {
        const errorMessage = 'A required parameter is missing in the request';
        const statusCode = 412;
        class ParameterMissingException extends HandledException {
            constructor(message){ super(message, statusCode); }
        }

        const myErrorThrowerService = () => {
            throw new ParameterMissingException(errorMessage);
        }

        const myErrorThrowerHandler = new LambdaHandler()
            .withHandler(myErrorThrowerService)
            .build();

        return LambdaTester(myErrorThrowerHandler)
            .event({})
            .expectResult(result => {
                expect(result.statusCode).to.equal(statusCode);
                expect(result.body).to.equal(errorMessage);
            });
    });    

    it('Trying to build a handler with both static and event-based params should throw an exception with the expected message', () => {
        let action = () => {
            new LambdaHandler()
                .withHandler(() => {})
                .withEventParams(e => [e.a, e.b])
                .withStaticParams('1', '2', 3)
                .build();
        };

        let expectedErrorMessage = 'Error building lambda handler module: must use either "withParams(...params)" or "withEventParams(mapperFunc)", not both';

        expect(action).to.throw(expectedErrorMessage);
    });

    it('Trying to build a lambda handler without an underlying handler function should throw an exception with the expected message', () => {
        let action = () => {
            new LambdaHandler()
                .build();
        };

        let expectedErrorMessage = 'Must define an underlying function using "withHandler(<handlerFunction>)" before calling "build()';

        expect(action).to.throw(expectedErrorMessage);
    });

    describe('Correlation ID propagation', () => {
        it('If no Correlation ID is propagated from the event, should set context.awsRequestId as the new correlation id in the global context', async () => {    
            let event = { 
                httpMethod:'GET', //used to define the event as a Gateway API event
                headers: {}
            };
            let context = { 
                awsRequestId: 'myAwsRequestId'
            };
            let callback = () => { };

            let lambdaHandler = new LambdaHandler()
            .withHandler(() => {})
            .build();
        
            await lambdaHandler(event, context, callback);

            expect(correlationIds.get()['x-correlation-id']).to.equal(context.awsRequestId)
        });

        it('If a correlation id is propagated from the event, set it to the global context', async () => {
            let correlationId = 'myCorrelationId';
            let event = { 
                httpMethod:'GET', //used to define the event as a Gateway API event
                headers: {
                    'x-correlation-id': correlationId
                }
            };
            let context = { 
                awsRequestId: 'myAwsRequestId'
            };
            let callback = () => { };

            let lambdaHandler = new LambdaHandler()
            .withHandler(() => {})
            .build();
        
            await lambdaHandler(event, context, callback);

            expect(correlationIds.get()['x-correlation-id']).to.equal(correlationId)
        });

    });

});