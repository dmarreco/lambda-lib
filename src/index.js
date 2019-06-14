const log = require('./log');
const stringUtil = require('./string-util');
const Client = require('./client');
const LambdaEndpoint = require('./lambda-endpoint-builder');
const HandledException = require('./handled-exception');
const DynamoRepository = require('./repository/dynamo-repository');
const resolveSsmParameter = require('./resolve-ssm-parameter');
const eventBus = require('./event-bus');

module.exports = Object.assign({
    log,
    stringUtil,
    Client,
    LambdaEndpoint,
    HandledException,
    DynamoRepository,
    resolveSsmParameter,
    eventBus
}, Client);