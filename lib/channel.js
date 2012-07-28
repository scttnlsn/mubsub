var events = require('events');
var mongo = require('mongodb');
var util = require('util');
var Promise = require('./promise');

module.exports = Channel;

function Channel(name, db, options) {
    this.collection = new Promise();
    this.closed = false;
    options || (options = {});
    options.size || (options.size = 100000);

    var self = this;

    db.then(function(err, db) {
        if (err) return self.collection.resolve(err);

        var collectionOptions = {
            capped: true,
            size: options.size,
            max: options.max
        };

        db.createCollection(name, collectionOptions, function(err, collection) {
            if (err) return self.collection.resolve(err);

            var query = { _id: { $exists: true }};
            var sort = [['$natural', 'desc']];
            var update = { _id: new mongo.ObjectID() };
            var options = { upsert: true };

            collection.findAndModify(query, sort, update, options, function(err, doc) {
                if (err) return self.collection.resolve(err);
                self.collection.resolve(null, collection);
            });
        });
    });
}

util.inherits(Channel, events.EventEmitter);

Channel.prototype.publish = function(obj, callback) {
    callback || (callback = function() {});

    if (this.closed) {
        return callback(new Error('Channel is closed'));
    }

    delete obj._id;

    this.collection.then(function(err, collection) {
        if (err) return callback(err);
        collection.insert(obj, callback);
    });
};

Channel.prototype.subscribe = function(query, callback) {
    var self = this;
    var subscribed = true;

    if (this.closed) {
        return this.emit('error', new Error('Channel is closed'));
    }

    if (typeof query === 'function' && callback === undefined) {
        callback = query;
        query = {};
    }

    this.collection.then(function(err, collection) {
        if (self.closed) return;
        if (err) return self.emit('error', err);

        collection.find({}).sort({ '$natural': -1 }).limit(1).nextObject(function(err, doc) {
            if (err) return self.emit('error', err);

            query._id = { '$gt': doc._id };

            var options = { tailable: true, awaitdata: true, numberOfRetries: -1 };
            var cursor = collection.find(query, options).sort({ '$natural': 1 });

            (function next() {
                process.nextTick(function() {
                    cursor.nextObject(function(err, doc) {
                        if (err) self.emit('error', err);
                        if (doc) callback(doc);
                        if (subscribed && !self.closed) next();
                    });
                });
            })();
        });
    });

    return {
        unsubscribe: function() {
            subscribed = false;
        }
    };
};

Channel.prototype.close = function() {
    this.closed = true;
};