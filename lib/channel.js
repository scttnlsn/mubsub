var EventEmitter = require('events').EventEmitter;
var util = require('util');
var Promise = require('./promise');

var noop = function() {};

/**
 * Channel constructor.
 *
 * @param {Connection} connection
 * @param {String} [name] optional channel/collection name, default is "mubsub"
 * @param {Object} [options] optional options
 *   - `size` max size of the collection in bytes, default is to 5mb
 *   - `retryInterval` time in ms to wait if no docs found, default is 200ms
 * @api public
 */
function Channel(connection, name, options) {
    options || (options = {});
    options.capped = true;
    // In mongo v <= 2.2 index for _id is not done by default
    options.autoIndexId = true;
    options.size || (options.size = 1024 * 1024 * 5);
    this.retryInterval = options.retryInterval || 200;
    this.connection = connection;
    this.collection = new Promise();
    this.closed = false;
    this.listening = null;
    this.create(name || 'mubsub', options).listen();
}

module.exports = Channel;
util.inherits(Channel, EventEmitter);

/**
 * Close the channel.
 *
 * @return {Channel} this
 * @api public
 */
Channel.prototype.close = function() {
    this.closed = true;

    return this;
};

/**
 * Publish an event.
 *
 * @param {String} event
 * @param {Object} [message]
 * @param {Function} [callback]
 * @return {Channel} this
 * @api public
 */
Channel.prototype.publish = function(event, message, callback) {
    var options = callback ? {safe: true} : {};
    callback || (callback = noop);

    this.ready(function(collection) {
        collection.insert({ event: event, message: message }, options, function(err, docs) {
            if (err) return callback(err);
            callback(null, docs[0]);
        });
    });

    return this;
};

/**
 * Subscribe an event.
 *
 * @param {String} [event] if no event passed - all events are subscribed.
 * @param {Function} callback
 * @return {Object} unsubscribe function
 * @api public
 */
Channel.prototype.subscribe = function(event, callback) {
    var self = this;

    if (typeof event == 'function') {
        callback = event;
        event = 'message';
    }

    this.on(event, callback);

    return {
        unsubscribe: function() {
            self.removeListener(event, callback);
        }
    };
};

/**
 * Create a channel collection.
 *
 * @param {String} name
 * @param {Object} options
 * @return {Channel} this
 * @api private
 */
Channel.prototype.create = function(name, options) {
    var self = this;

    if (this.connection.db) {
        this.connection.db.createCollection(name, options, this.collection.resolve.bind(this.collection));
    } else {
        this.connection.once('connect', function() {
            self.create(name, options);
        });
    }

    return this;
};

/**
 * Create a listener which will emit events for subscribers.
 * It will listen to any document with event property.
 *
 * @return {Channel} this
 * @api private
 */
Channel.prototype.listen = function() {
    var self = this;

    this.latest(this.handle(true, function(latest, collection) {
        var cursor = collection
                .find(
                    { _id: { $gt: latest._id } },
                    { tailable: true, numberOfRetries: -1, tailableRetryInterval: self.retryInterval }
                )
                .sort({ $natural: 1 });

        var next = self.handle(function(doc) {
            // There is no document only if the cursor is closed by accident.
            // F.e. if collection was dropped.
            if (!doc) return self.emit('error', new Error('Broken cursor'));

            if (doc.event) {
                self.emit(doc.event, doc.message);
                self.emit('message', doc.message);
            }
            self.emit('document', doc);
            process.nextTick(more);
        });

        var more = function() {
            cursor.nextObject(next);
        };

        more();
        self.listening = collection;
        self.emit('ready', collection);
    }));

    return this;
};

/**
 * Get the latest document from the collection. Insert a dummy object in case
 * the collection is empty, because otherwise we don't get a tailable cursor
 * and need to poll in a loop.
 *
 * @param {Function} callback
 * @return {Channel} this
 * @api private
 */
Channel.prototype.latest = function(callback) {
    var self = this;

    this.collection.then(function(err, collection) {
        if (err) return callback(err);

        collection
            .find()
            .sort({ $natural: -1 })
            .limit(1)
            .nextObject(function(err, doc) {
                if (err || doc) return callback(err, doc, collection);

                collection.insert({dummy: true}, {safe: true}, function(err, docs) {
                    if (err) return callback(err);
                    callback(err, docs[0], collection);
                });
            });
    });

    return this;
};

/**
 * Return a function which will handle errors and consider channel and connection
 * state.
 *
 * @param {Boolean} [exit] if error happens and exit is true, callback will not be called
 * @param {Function} callback
 * @return {Function}
 * @api private
 */
Channel.prototype.handle = function(exit, callback) {
    var self = this;

    if (typeof exit === 'function') {
        callback = exit;
        exit = null;
    }

    return function() {
        if (self.closed || self.connection.destroyed) return;

        var args = [].slice.call(arguments);
        var err = args.shift();

        if (err) self.emit('error', err);
        if (err && exit) return;

        callback.apply(self, args);
    };
};

/**
 * Call back if collection is ready for publishing.
 *
 * @param {Function} callback
 * @return {Channel} this
 * @api private
 */
Channel.prototype.ready = function(callback) {
    if (this.listening) {
        callback(this.listening);
    } else {
        this.once('ready', callback);
    }

    return this;
};
