const { expect } = require('chai');
const snsClient = require('../src/client/sns-client');


describe('Send SMS message', () => {
    before(() => {
        process.env.LOG_LEVEL = 'ERROR';
        process.env.DISABLE_XRAY = true;
    });

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