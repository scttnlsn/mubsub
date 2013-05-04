var Connection = require('./connection'),
    Channel = require('./Channel');

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
 * @see Connection
 * @api public
 */
exports.Connection = Connection;

/**
 * Expose Channel constructor.
 *
 * @see Channel
 * @api public
 */
exports.Channel = Channel;

