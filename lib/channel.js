var events = require('events');
var util = require('util');
var Promise = require('./promise');
var noop = function() {};

module.exports = Channel;

function Channel(connection, name, options) {
    this.connection = connection;
    this.collection = new Promise();
    this.closed = false;

    options || (options = {});

    var self = this;

    var params = {
        capped: true,
        size: options.size || 100000,
        max: options.max
    };

    this.connection.db.createCollection(name, params, this.collection.resolve.bind(this.collection));
}

util.inherits(Channel, events.EventEmitter);

Channel.prototype.publish = function(obj, callback) {
    var options = callback ? {safe: true} : {};
    callback || (callback = noop);

    delete obj._id;

    this.collection.then(function(err, collection) {
        if (err) return callback(err);

        collection.insert(obj, options, callback);
    });

    return this;
};

Channel.prototype.subscribe = function(query, callback) {
    var self = this;
    var subscribed = true;

    if (typeof query === 'function' && callback === undefined) {
        callback = query;
        query = {};
    }

    var handle = function(die, callback) {
        if (typeof die === 'function' && callback === undefined) {
            callback = die;
            die = false;
        }

        return function() {
            if (!subscribed) return;
            if (self.connection.disconnected()) return;

            var args = [].slice.call(arguments);
            var err = args.shift();

            if (err) self.emit('error', err);
            if (err && die) return;

            callback.apply(self, args);
        };
    };

    this.latest(handle(true, function(latest) {
        self.collection.then(handle(function(collection) {
            var options = { tailable: true, awaitdata: true, numberOfRetries: -1 };
            var cursor = collection.find({ $gt: latest._id }, options).sort({ $natural: 1 });

            (function more() {
                cursor.nextObject(handle(function(doc) {
                    if (!doc) return self.emit('error', new Error('Broken cursor.'));
                    callback(doc);
                    latest = doc;
                    more();
                }));
            }());
        }));
    }));

    return {
        unsubscribe: function() {
            subscribed = false;
        }
    };
};

// Get the latest document from the collection. Insert a dummy object in case
// the collction is empty, because otherwise we don't get a tailable cursor
// and need to poll in a loop.
Channel.prototype.latest = function(callback) {
    this.collection.then(function(err, collection) {
        if (err) return callback(err);

        collection
            .find()
            .sort({ $natural: -1 })
            .limit(1)
            .nextObject(function found(err, doc) {
                if (err) return callback(err);

                if (doc) {
                    callback(null, doc);
                } else {
                    collection.insert({dummy: true}, {safe: true}, found);
                }
            });
    });

    return this;
};
