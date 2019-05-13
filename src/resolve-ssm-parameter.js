const { SSM } = require('aws-sdk');
const ssm = new SSM();

module.exports = async(parameter, decryption) => {
    let params = {
        Name: parameter,
        WithDecryption: decryption
    };
    let res = await ssm.getParameter(params).promise();
    return res.Parameter.Value;
};