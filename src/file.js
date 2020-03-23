// import library
const Wavefile = require('wavefile');
const fs = require('fs');
const CotohaApi = require('./cotoha');

let buffer = fs.readFileSync('../resources/sample.wav');
let wavfile = new Wavefile(buffer); // convert to wavefile object
let rate = wavfile.fmt.sampleRate;
let samples = wavfile.data.samples;
let Requester = new CotohaApi(filepath = './sample.json',
    modelID = 'ja-gen_tf-16',); 
Requester.getToken().then(res => {
    userData = res;
    }).then(async () => {
        let body = await Requester.file(userData, dictpath = '../resources/sample_dict.tsv',samplingRate = rate, audio_part= samples);
    }).catch(error => {
        console.log(error);
}).catch(error => {
    console.log(error);
});

