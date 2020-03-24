// import library
const fs = require('fs');
const CotohaApi = require('./cotoha');

let Requester = new CotohaApi(filepath = './sample.json',
    modelID = 'ja-gen_tf-16',); 
    
Requester.getToken().then(res => {
    userData = res;
    }).then(async () => {
        let body = await Requester.clear(userData);
        console.log(body);
    }).catch(error => {
        console.log(error);
}).catch(error => {
    console.log(error);
});

