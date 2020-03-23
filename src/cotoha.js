// import library
const requests = require('request').defaults({
    jar: true
});
const fs = require('fs');
const FormData = require('form-data');

module.exports = class Requester {
    constructor(filepath,modelID) {
        this.oauthUrl = 'https://api.ce-cotoha.com/v1/oauth/accesstokens'; // should be the same for all environments
        this.hostname = 'https://api.ce-cotoha.com/api'; // should be the same for all environments
        
        // check if file is supplied
        if (filepath != null || filepath !== '') {
            let credentials = JSON.parse(fs.readFileSync(filepath));
            this.domainID = credentials.domain_id;
            this.client_id = credentials.client_id;
            this.client_secret = credentials.client_secret;
        } else {
            throw new Error('Missing credentials file');
        }
        // set the model
        this.modelID = modelID;
        // url for speech recognition
        this.speechrec_url = this.hostname + '/asr/v1/speech_recognition/' + this.modelID;    
    }

    // async method to get token
    getToken() {
        let options = {
            method: 'POST',
            url: this.oauthUrl,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            },
            body: {
                'grantType': 'client_credentials',
                'clientId': this.client_id,
                'clientSecret': this.client_secret
            },
            json: true
        };

        return new Promise(function(resolve, reject) {
            requests(options, function(error, response, body) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    let userData = {
                        accessToken: body.access_token
                    };
                    resolve(userData);
                }
            });
        });
    }
    start(userData, dictpath,  samplingRate) {

        let words = [];
        let lines = fs.readFileSync(dictpath, 'utf8').toString().split('\n');
        for(let line of lines) {
            let arr = line.split('\t');
            if (arr.length===3){
                let word = {surface: arr[0], reading: arr[1], prob: arr[2]};
                words.push(word);
            }
            else if(arr.length===2){
                let word = {surface: arr[0], reading: arr[1]};
                words.push(word);
            }
          }

        this.param_json = {
            'param': {
                'baseParam.samplingRate': samplingRate,
                'recognizeParameter.domainId': this.domainID,
                'baseParam.delimiter': false,
                'baseParam.punctuation': true,
                'baseParam.reading': true,
                'baseParam.filler': true,
                'recognizeParameter.enableProgress': false, 
                'recognizeParameter.maxResults': 2,
            },
            'words': words,
        };

        let obj = this.param_json;
        obj.msg = {
            'msgname': 'start'
        };
        let options = {
            method: 'POST',
            url: this.speechrec_url,
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Authorization': 'Bearer ' + userData.accessToken
            },
            body: obj,
            json: true
        };
        return new Promise(function(resolve, reject) {
            requests(options, function(error, response, body) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    resolve(body[0]['msg']['uniqueId']);
                };
            });
        });
    }
    // just a post command
    post(userData, buffer) {
        let self = this;
        let options = {
            method: 'POST',
            headers: {
                'Connection': 'keep-alive',
                'Content-Type': 'application/octet-stream',
                'Unique-ID': userData.uniqueId,
                'Authorization': 'Bearer ' + userData.accessToken
            },
            url: this.speechrec_url
        };
        options.body = buffer;
        return new Promise(function(resolve, reject) {
            requests(options, function(error, response, body) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    let sentence = self.parseResult(response, body);
                    resolve(sentence);
                }
            });
        });
    }

    parseResult(response, body) {

        let detectedSentence = '';

        if (response.statusCode === 200 || response.statusCode === 204) {
            try {
                if (typeof body === 'string') {
                    body = JSON.parse(body);
                }
                for (let res in body) {
                    try{
                    if (body[res]['msg']['msgname'] === 'recognized' && body[res]['result']['sentence'][0] !== undefined && body[res]['result']['sentence'] !== []) {
                        detectedSentence += body[res]['result']['sentence'][0]['surface'];
                        for( var key in body[res]['result']['sentence']) {
                            console.log('surface-', key, ': ', body[res]['result']['sentence'][key]['surface']);
                            console.log('reading-', key, ': ', body[res]['result']['sentence'][key]['reading']);
                        }
                        console.log("-------------------------------------");
                    }
                }catch(error) {;}
                }
            } catch (e) {
                // we want to ignore the JSON parse error
                if (e.name !== 'SyntaxError') {
                    throw new Error(e);
                }
            }

        }
        return detectedSentence;
    }

    // send stop signal
    stop(userData) {
        let self = this;
        let options = {
            headers: {
                'Unique-ID': userData.uniqueId,
                'Content-Type': 'application/json;charset=UTF-8',
                'Authorization': 'Bearer ' + userData.accessToken
            },
            body: {
                'msg': {
                    'msgname': 'stop'
                }
            },
            json: true,
            method: 'POST',
            url: this.speechrec_url
        };
        return new Promise(function(resolve, reject) {
            requests(options, function(error, response, body) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    let sentence = self.parseResult(response, body);
                    resolve(sentence);
                }
            });
        }).catch(error => {
            console.log(error);
        });
    }

    clear(userData) {
        let self = this;
        let options = {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + userData.accessToken
            },
            url: this.hostname + '/asr/v1/speech_words/' + this.modelID + '/clear',
            qs: {
                domainid: self.domainID
              },
        };
        return new Promise(function(resolve, reject) {
            requests(options, function(error, response, body) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    let sentence = self.parseResult(body);
                    resolve(body);
                }
            });
        }).catch(error => {
            console.log(error);
        });
    };

    isset(userData) {
        let self = this;
        let options = {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + userData.accessToken
            },
            url: this.hostname + '/asr/v1/speech_words/' + this.modelID + '/isset',
            qs: {
                domainid: self.domainID
              },
        };
        return new Promise(function(resolve, reject) {
            requests(options, function(error, response, body) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    let sentence = self.parseResult(body);
                    resolve(body);
                }
            });
        }).catch(error => {
            console.log(error);
        });
    };
    download(userData) {
        let self = this;
        let options = {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + userData.accessToken
            },
            url: this.hostname + '/asr/v1/speech_words/' + this.modelID + '/download',
            qs: {
                domainid: self.domainID
              },
        };
        return new Promise(function(resolve, reject) {
            requests(options, function(error, response, body) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    let sentence = self.parseResult(body);
                    resolve(body);
                }
            });
        }).catch(error => {
            console.log(error);
        });
    };

    upload(userData, Path) {
        let form = new FormData();
        form.append('cascadeword', fs.createReadStream(Path), {contentType: 'text/plain'},);
        let self = this;
        let contentType = form.getHeaders()['content-type']
        let options = {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + userData.accessToken,
                'Content-Type': contentType,
            },
            url: this.hostname + '/asr/v1/speech_words/' + this.modelID + '/upload',
            qs: {
                domainid: self.domainID
              },
            body: form,
        };
        return new Promise(function(resolve, reject) {
            requests(options, function(error, response, body) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    let sentence = self.parseResult(body);
                    resolve(body);
                }
            });
        }).catch(error => {
            console.log(error);
        });
    };

    file(userData, dictPath,  samplingRate, audio_part) {
        let words = [];
        let lines = fs.readFileSync(dictpath, 'utf8').toString().split('\n');
        for(let line of lines) {
            let arr = line.split('\t');
            if (arr.length===3){
                let word = {surface: arr[0], reading: arr[1], prob: arr[2]};
                words.push(word);
            }
            else if(arr.length===2){
                let word = {surface: arr[0], reading: arr[1]};
                words.push(word);
            }
          }
        
        let form = new FormData();

        this.param_json = {
            'param': {
                'baseParam.samplingRate': samplingRate,
                'recognizeParameter.domainId': this.domainID,
                'baseParam.delimiter': false,
                'baseParam.punctuation': true,
                'baseParam.reading': true,
            },
            'words': words,
        };

       

        let parameter_part = this.param_json;
        parameter_part.msg = {
            'msgname': 'start'
        };
        let command_part = {};
        command_part.msg = {
            'msgname': 'stop'
        };

        form.append('parameter',JSON.stringify(parameter_part),{contentType: 'application/json; charset=UTF-8'})
        form.append('audio', audio_part, {contentType: 'application/octet-stream'},);
        form.append('command',JSON.stringify(command_part),{contentType: 'application/json; charset=UTF-8'})
        let self = this;
        let contentType = form.getHeaders()['content-type']
        let options = {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + userData.accessToken,
                'Content-Type': contentType,
            },
            url: this.hostname + '/asr/v1/speech_recognition/' + this.modelID ,
            body: form,
        };
        return new Promise(function(resolve, reject) {
            requests(options, function(error, response, body) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    let sentence = self.parseResult(response, body);
                  
                    resolve(sentence);
                    

                }
            });
        }).catch(error => {
            console.log(error);
        });
    };

};
