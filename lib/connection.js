var EventEmitter = require('events').EventEmitter;
var util = require('util');
var MongoClient = require('mongodb').MongoClient;
var Channel = require('./channel');


var mongoValidOptionNames = [
  // validOptionNames
  'poolSize', 'ssl', 'sslValidate', 'sslCA', 'sslCert',
  'sslKey', 'sslPass', 'autoReconnect', 'noDelay', 'keepAlive', 'connectTimeoutMS',
  'socketTimeoutMS', 'reconnectTries', 'reconnectInterval', 'ha', 'haInterval',
  'replicaSet', 'secondaryAcceptableLatencyMS', 'acceptableLatencyMS',
  'connectWithNoPrimary', 'authSource', 'w', 'wtimeout', 'j', 'forceServerObjectId',
  'serializeFunctions', 'ignoreUndefined', 'raw', 'promoteLongs', 'bufferMaxEntries',
  'readPreference', 'pkFactory', 'promiseLibrary', 'readConcern', 'maxStalenessSeconds',
  'loggerLevel', 'logger', 'promoteValues', 'promoteBuffers', 'promoteLongs',
  'domainsEnabled', 'keepAliveInitialDelay', 'checkServerIdentity'
  // ignoreOptionNames
  'native_parser',
  // legacyOptionNames
  'server', 'replset', 'replSet', 'mongos', 'db'
  ];


/**
 * Connection constructor.
 *
 * @param {String|Db} uri string or Db instance
 * @param {Object} mongo driver options
 * @api public
 */
function Connection(uri, options) {
    var self = this;

    options || (options = {});
    options.autoReconnect != null || (options.autoReconnect = true);

    // It's a Db instance.
    if (uri.collection) {
        this.db = uri;
    } else {

        var mongoOptions = {}
        mongoValidOptionNames.forEach(function(key){
            (options[key] !== undefined) && (mongoOptions[key] = options[key])
        })

        MongoClient.connect(uri, mongoOptions, function (err, db) {
            if (err) return self.emit('error', err);
            self.db = db;
            self.emit('connect', db);
            db.on('error', function (err) {
                self.emit('error', err);
            });
        });
    }

    this.destroyed = false;
    this.channels = {};
}

module.exports = Connection;
util.inherits(Connection, EventEmitter);

/**
 * Current connection state.
 *
 * @type {String}
 * @api public
 */
Object.defineProperty(Connection.prototype, 'state', {
    enumerable: true,

    get: function () {
        var state;

        // Using 'destroyed' to be compatible with the driver.
        if (this.destroyed) {
            state = 'destroyed';
        }
        else if (this.db) {
            state = this.db.serverConfig.isConnected()
                ? 'connected' : 'disconnected';
        } else {
            state = 'connecting';
        }

        return state;
    }
});

/**
 * Creates or returns a channel with the passed name.
 *
 * @see Channel
 * @return {Channel}
 * @api public
 */
Connection.prototype.channel = function (name, options) {
    if (typeof name === 'object') {
        options = name;
        name = 'mubsub';
    }

    if (!this.channels[name] || this.channels[name].closed) {
        this.channels[name] = new Channel(this, name, options);
    }

    return this.channels[name];
};

/**
 * Close connection.
 *
 * @param {Function} [callback]
 * @return {Connection} this
 * @api public
 */
Connection.prototype.close = function (callback) {
    this.destroyed = true;
    this.db.close(callback);

    return this;
};
