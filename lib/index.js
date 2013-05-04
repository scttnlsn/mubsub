var Connection = require('./connection');
var Channel = require('./Channel');
var mongodb = require('mongodb');

/**
 * Create connection.
 *
 * @see Connection
 * @return {Connection}
 * @api public
 */
module.exports = exports = function(uri, options) {
    return new Connection(uri, options);
};

/**
 * Expose Connection constructor.
 *
 * @api public
 */
exports.Connection = Connection;

/**
 * Expose Channel constructor.
 *
 * @api public
 */
exports.Channel = Channel;

/**
 * Expose mongodb module.
 *
 * @api public
 */
exports.mongodb = mongodb;

