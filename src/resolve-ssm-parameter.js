const { SSM } = require('aws-sdk');
const ssm = new SSM();

//TODO Deprecar essa libe e usar o middleware do middy SSM para injetar valores do SSM para o environment em runtime
module.exports = async(parameter, decryption) => {
    let params = {
        Name: parameter,
        WithDecryption: decryption
    };
    let res = await ssm.getParameter(params).promise();
    return res.Parameter.Value;
};