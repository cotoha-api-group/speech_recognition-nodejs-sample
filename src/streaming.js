// import library
const Wavefile = require('wavefile');
const fs = require('fs');
const chunk = require('buffer-chunks');
const CotohaApi = require('./cotoha');

// in ms
const Interval = 240;

//this sample code reads a file called sample.wav
let buffer = fs.readFileSync('../resources/sample.wav');
let wavfile = new Wavefile(buffer); // convert to wavefile object
let rate = wavfile.fmt.sampleRate;
let samples = wavfile.data.samples;

let chunkSize = Math.round(rate * Interval / 1000) * 2; // interval is set in ms
let byteChunks = chunk(samples, chunkSize);
let userData = ''; // could be better if not used as a global

let Requester = new CotohaApi(filepath = './sample.json',
    modelID = 'ja-gen_tf-16',); 
    
Requester.getToken().then(res => {
    userData = res;
    if( userData.accessToken === undefined){
        console.log("accessToken is invalid.");
    }
    Requester.start(userData, dictpath = '../resources/sample_dict.tsv',samplingRate = rate).then(async (id) => {
        userData.uniqueId = id;
        return new Promise(async (resolve, reject) => {
            // change this part to allow audio stream from a source, i.e microphone etc
            for (let audioPartNumber in byteChunks) {
                let sentence = await Requester.post(userData, byteChunks[audioPartNumber]);
            }
            // resolve here so we can send the stop message
            resolve();
        }).then(async () => {
            // do what you need to do with the sentence here
            let sentence = await Requester.stop(userData);
        }).catch(error => {
            console.log(error);
        });
    });
    
}).catch(error => {
    console.log(error);
}).catch(error => {
    console.log(error);
});
