const chai = require('chai');
const config = require('../src/config.js');
chai.should();

describe('Couchbase module test', function() {
    const couchbase = require('../src/index.js').getInstance(config);
    // insert
    it('couchdb insert action test', function(done) {
        couchbase.insert('parent_test_999999', {
            table_type: 'parent_test',
            sku: '999999',
            ean: '999999'
        }).then(result => {
            done();
        });
    });
    // upsert
    it('couchdb upsert action test', function(done) {
        couchbase.upsert('parent_test_999999', {
            table_type: 'parent_test',
            sku: '999999',
            title: 'couchbase-test'
        }).then(result => {
            done();
        });
    });
    // partial update
    it('couchdb partial update action test', function(done) {
        couchbase.partialUpdate('parent_test_999999', {
            name: 'name-test',
            country: 'nl'
        }).then(result => {
            done();
        });
    });
    // get
    it('couchdb get action test', function(done) {
        couchbase.getByCode('parent_test_999999').then(result => {
            done();
        });
    });
    // dbQuery
    it('couchdb sql query test', function(done) {
        let sql = 'SELECT * FROM `' + config.bucket + '` WHERE `table_type` = $1 OFFSET $2 LIMIT $3';
        couchbase.dbQuery(sql, ['parent_test', 0, 1]).then(result => {
            done();
        });
    });
    it('couchdb filter query test', function(done) {
        couchbase.queryByFilters({}, 'sku DESC', 'parent_test').then(result => {
            done();
        });
    });
    // delete
    it('couchdb delete action test', function(done) {
        couchbase.removeByCode('parent_999999').then(result => {
            done();
        });
    });
});