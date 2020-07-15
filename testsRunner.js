/* istanbul ignore next */
let Mocha = require('mocha');
let fs = require('fs');
let path = require('path');

let mocha = new Mocha({
    reporter: 'mocha-multi-reporters',
    reporterOptions: {
        configFile: './tests/reporters.json',
    },
    timeout: 15000,
});

let testDir = path.join(__dirname, 'tests');
let directories = [];
let dir;

/**
 *
 * @param {String} file
 * @return {boolean}
 */
function isTest(file) {
    return file.substr(-7) === 'test.js';
}

/**
 *
 * @param {String} file
 */
/* istanbul ignore next */
function addTest(file) {
    /* istanbul ignore next */
    mocha.addFile(path.join(dir, file));
}

fs.readdirSync(testDir).filter(function(file) {
    if (fs.statSync(path.join(testDir, file)).isDirectory()) {
        directories.push(path.join(testDir, file));
    } else if (isTest(file)) {
        mocha.addFile(path.join(testDir, file));
    }
});

let ndx;

for (ndx in directories) {
    /* istanbul ignore next */
    if (directories[ndx] !== undefined) {
        dir = directories[ndx];
        fs.readdirSync(dir).filter(isTest)
            .forEach(addTest);
    }
}

setTimeout(function() {
    console.log('waiting for several secs');
    mocha.run(function(failures) {
        process.exit();
    });
}, 3000);