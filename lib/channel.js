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

    // This timeout will be used only if collection is empty.
    this.wait = options.wait || 1000;

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

    this.collection.then(handle(true, function(collection) {
        var latest = null;

        collection.find({}).sort({ $natural: -1 }).limit(1).nextObject(handle(function(doc) {
            if (doc) latest = doc._id;

            (function poll() {
                if (latest) query._id = { $gt: latest };

                var options = { tailable: true, awaitdata: true, numberOfRetries: -1 };
                var cursor = collection.find(query, options).sort({ $natural: 1 });

                (function more() {
                    cursor.nextObject(handle(function(doc) {
                        if (!doc) return setTimeout(poll, self.wait);

                        callback(doc);
                        latest = doc._id;
                        more();
                    }));
                })();
            })();
        }));
    }));

    return {
        unsubscribe: function() {
            subscribed = false;
        }
    };
};
