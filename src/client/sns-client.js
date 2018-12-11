const correlationIds = require('../correlation-ids');

var sns;

const log = require('../log');

function getAwsSnsLib() {
    if (!sns) {
       if (process.env.DISABLE_XRAY == 'true') {
            const AWS = require('aws-sdk');
            sns = new AWS.SNS();
       } else {
            const XRay = require('aws-xray-sdk');
            const AWS = XRay.captureAWS(require('aws-sdk'));
            sns = new AWS.SNS();
       }
    }
    return sns;
}

function _addCorrelationIds(messageAttributes) {
    let attributes = {};
    let context = correlationIds.get();
    for (let key in context) {
        attributes[key] = {
            DataType: 'String',
            StringValue: context[key]
        };
    }
    return Object.assign(attributes, messageAttributes || {});
}


module.exports.publish = (arn, content, _attributes) => {
    const params = {
        Message: JSON.stringify(content),
        TopicArn: arn,
        MessageAttributes: _addCorrelationIds(_attributes || {})
    };

    log.info('Publishing to SNS topic', params);
    return getAwsSnsLib().publish(params).promise();
};