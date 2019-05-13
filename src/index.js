const log = require('./log');
const stringUtil = require('./string-util');
const Client = require('./client');
const LambdaEndpoint = require('./lambda-endpoint-builder');
const HandledException = require('./handled-exception');
const DynamoRepository = require('./repository/dynamo-repository-order');
const resolveSsmParameter = require('./resolve-ssm-parameter');

module.exports = Object.assign({
    log,
    stringUtil,
    Client,
    LambdaEndpoint,
    HandledException,
    DynamoRepository,
    resolveSsmParameter
}, Client);