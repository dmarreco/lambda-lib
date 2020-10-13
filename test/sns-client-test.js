const { expect } = require('chai');

const AWS = require('aws-sdk');

const snsClient = require('../src/client/sns-client');

describe ('SNS Client', () => {
    before(() => {
        process.env.LOG_LEVEL = 'ERROR';
    });

    describe.skip('Send SMS message', () => {
        it('Should return status code 200 and "MessageId"' , async () => {
            let phone = '+5521992032090';
            let content = 'Teste de envio de mensagem SMS';
            let attributes = {
                scope: {
                    DataType: 'String.Array',
                    StringValue: JSON.stringify(['sms'])
                }
            };
    
            let response = await snsClient.send(phone, content, attributes);
    
            expect(response).to.be.not.undefined;
            expect(response.MessageId).to.be.not.undefined;
        });
    });
    
    
    describe('Publish to SNS Topic', () => {
        const topicArn = 'arn:aws:sns:sa-east-1:9999999999:myTopic';

        const result = snsClient.publish(topicArn, 'myMessageContent');
    });
});

