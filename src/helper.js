'use strict';
const util = require('util');

module.exports = {
    /**
     * Wrap query terms
     * @param {*} item
     * @param {*} seq
     * @return {string}
     */
    wrapQueryTerm: function (item, seq) {
        if (item == 'activeTime') {
            return 'startTime <= $' + seq + ' AND endTime >= $' + seq;
        }
        return util.format(
            '`%s` %s %s',
            item,
            this.getOperator(item),
            ('$' + seq)
        );
    },
    /**
     * @param {*} term
     * @return {string}
     */
    getOperator: function(term) {
        let op = '';
        switch (term) {
            case 'startTime':
                op = '>=';
                break;

            case 'endTime':
                op = '<=';
                break;

            default:
                op = '=';
                break;
        }
        return op;
    }
}