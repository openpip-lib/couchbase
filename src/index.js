'use strict';
const _                     = require('lodash');
const _couchbase            = require('couchbase');
const util                  = require('util');
const COUCHBASE_CONSTANTS   = require('./constant.js');
const helper                = require('./helper.js');
let N1qlQuery               = _couchbase.N1qlQuery;

class couchdb {

    constructor(config) {
        this.config = config;
        this.connect();
    }

    connect() {
        let host        = this.config.host;
        let port        = this.config.port;
        let username    = this.config.username;
        let password    = this.config.password;

        let cluster     = new _couchbase.Cluster('couchbase://' + host + ':' + port);
        cluster.authenticate(username, password);
        this.cluster = cluster;
    }

	static getInstance(config) {
		if (_.isEmpty(config.bucket)) {
			throw new Error('Bucket cannot be empty.');
		}

		if (!couchdb[config.bucket]) {
			couchdb[config.bucket] = new couchdb(config);
		}
		return couchdb[config.bucket];
	}

	getBucket() {
		if (!this.bucketIns) {
			this.bucketIns = this.cluster.openBucket(this.config.bucket);
		}
		return this.bucketIns;
	}

	resetBucket() {
		if (this.bucketIns) {
			this.bucketIns.disconnect();
		}
		this.bucketIns = null;
	}

    getByCode(code) {
        let that = this;
        return new Promise((resolve, reject) => {
            that.getBucket().get(code, (err, result) => {
                if (err) {
                    return reject(err);
                }
                return resolve(result.value);
            });
        }).catch((err) => {
            return that.processError(err, COUCHBASE_CONSTANTS.OPERATION_TYPE_LOAD);
        });
    }

    insert(code, data) {
        let that = this;
        return new Promise((resolve, reject) => {
            that.getBucket().insert(code, data, (err, result) => {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        }).catch((err) => {
            return that.processError(err, COUCHBASE_CONSTANTS.OPERATION_TYPE_INSERT);
        });
    }

    upsert(code, data) {
        let that = this;
        return new Promise((resolve, reject) => {
            that.getBucket().upsert(code, data, (err, result) => {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        }).catch((err) => {
            return that.processError(err, COUCHBASE_CONSTANTS.OPERATION_TYPE_UPSERT);
        });
    }

    removeByCode(code) {
        let that = this;
        return new Promise((resolve, reject) => {
            that.getBucket().remove(code, (err, result) => {
                if (err) {
                    return reject(err);
                }
                return resolve(result);
            });
        }).catch((err) => {
            return that.processError(err, COUCHBASE_CONSTANTS.OPERATION_TYPE_DELETE);
        });
    }

    /*
     *  @param {string} sql
     *  @param {array} params
     */
    dbQuery(sql, params) {
        let that = this;
        return new Promise((resolve, reject) => {
            return that.getBucket().query(N1qlQuery.fromString(sql), params, (err, rows) => {
                if (err) {
                    return reject(err);
                }
                if (!rows.length) {
                    return resolve([]);
                }

                let result = [];
                rows.forEach((row) => {
                    if (_.isEmpty(row[that.config.bucket])) {
                        result.push(row);
                    } else {
                        result.push(row[that.config.bucket]);
                    }
                });
                return resolve(result);
            });
        }).catch((err) => {
            return that.processError(err, COUCHBASE_CONSTANTS.OPERATION_TYPE_SEARCH);
        });
    }

    /*
     *  @param {string} documentId
     *  @param {Object} obj
     *  Note:
     *  Unlike batched operations which is simply a way of sending multiple individual
     *  operations efficiently on the network, multiple subdoc operations are formed into
     *  a single command packet, which is then executed atomically on the server.
     *  You can submit up to 16 operations at a time.
     *  https://developer.couchbase.com/documentation/server/current/sdk/subdocument-operations.html
     */
    partialUpdate(documentId, obj) {
        let that = this;
        return new Promise((resolve, reject) => {
            let allFields = [];
            let execution = that.getBucket().mutateIn(documentId);
            _.forEach(obj, (v, k) => {
                execution = execution.upsert(k, v);
                allFields.push(k);
                if ((_.size(allFields) == _.size(obj)) || (_.size(allFields) % 16 == 0)) {
                    execution.execute((err, result) => {
                        if (err) {
                            return reject(err);
                        }
                        return resolve(result);
                    });
                    execution = that.getBucket().mutateIn(documentId);
                }
            });
        }).catch((err) => {
            return that.processError(err, COUCHBASE_CONSTANTS.OPERATION_TYPE_PARTIAL_UPDATE);
        });
    }

    processError(err, operationType) {
        if (err) {
            let errMessage = err.toString().toLowerCase();
            if (errMessage.indexOf('cannot perform operations on a shutdown bucket') != -1) {
                this.resetBucket();
            } else if ((operationType == COUCHBASE_CONSTANTS.OPERATION_TYPE_LOAD || operationType == COUCHBASE_CONSTANTS.OPERATION_TYPE_DELETE)
                && errMessage.indexOf('the key does not exist on the server') != -1) {
                return Promise.resolve({});
            }
        }
        throw err;
    }

    queryByFilters(filters, defaultOrder, tableType) {
        let that = this;
        let terms = ['table_type = "' + tableType + '"'];
        let values = [];
        let seq = 0;
        let perpage = 10;
        let limitInfo;
        let order = defaultOrder;

        if (filters['order']) {
            order = filters['order'];
            delete filters['order'];
        }

        if (filters['page'] && filters['rows']) {
            let page = parseInt(filters['page']) > 1 ? parseInt(filters['page']) - 1 : 0;
            perpage = parseInt(filters['rows']);
            limitInfo = util.format(
                ' limit %d offset %d',
                perpage,
                (page * perpage),
            );
        }

        /**
         * Remove pagination params
         */
        ['page', 'rows'].forEach((item) => {
            if (filters.hasOwnProperty(item)) {
                delete filters[item];
            }
        });

        let fieldsEmptyAllowed = ['active'];
        for (let item in filters) {
            if (!filters[item] && !fieldsEmptyAllowed.includes(item)) {
                continue;
            }
            terms.push(
                helper.wrapQueryTerm(item, ++seq),
            );
            values.push(filters[item]);
        }
        let sql = util.format(
            'SELECT * FROM %s WHERE %s ORDER BY %s',
            that.getBucket()._name,
            terms.join(' AND '),
            order,
        );
        if (limitInfo) {
            sql += limitInfo;
        }
        return that.dbQuery(sql, values);
    }
}

module.exports = couchdb;
