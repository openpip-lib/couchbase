'use strict';
const config = require('./src/config.js');
const request = require('request');
let Mocha = require('mocha');
let mocha = new Mocha({
    reporter: 'mocha-multi-reporters',
    reporterOptions: {
        configFile: './tests/reporters.json',
    },
    timeout: 15000,
});


// create bucket
let buffer = new Buffer(config.username + ':' + config.password),
    token = buffer.toString('base64'),
    requestData = {
        name: config.bucket,
        ramQuotaMB: 100,
        authType: 'none',
        replicaNumber: 2
    },
    url = 'http://' + config.host + ':' + config.port + '/pools/default/buckets';

request.post(
    {
        url: url,
        headers: {
            "content-type": "application/x-www-form-urlencoded; charset=utf-8",
            "Authorization": 'Basic ' + token
        },
        form: requestData
    },
    function(error, response, body) {
        if (error) {
            console.log(error);
            process.exit();
        }
        const couchbase = require('./src/index.js').getInstance(config);
        let sql = 'CREATE PRIMARY INDEX `couchbase_test` ON `' + config.bucket + '`';
        couchbase.dbQuery(sql, []).then(result => {
            console.log(result);
        });
    }
)

setTimeout(function() {
    console.log('waiting for several secs');
    mocha.run(function(failures) {
        // process.exit();
    });
}, 3000);