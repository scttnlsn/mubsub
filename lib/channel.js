var Promise = require('./promise');

module.exports = Channel;

function Channel(name, db, options) {
    this.collection = new Promise();

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
            self.collection.resolve(err, collection);
        });
    });
}

Channel.prototype.publish = function(obj, callback) {
    callback || (callback = function() {});

    delete obj._id;

    this.collection.then(function(err, collection) {
        if (err) return callback(err);
        collection.insert(obj, callback);
    });
};

Channel.prototype.subscribe = function(query, callback) {
    var self = this;
    var subscribed = true;

    if (typeof query === 'function' && callback === undefined) {
        callback = query;
        query = {};
    }

    this.collection.then(function(err, collection) {
        if (err) return callback(err);

        var latest = collection.find({}).sort({ '$natural': -1 }).limit(1);
        latest.nextObject(function(err, doc) {
            if (err) return callback(err);
            if (doc) query._id = { '$gt': doc._id };

            var cursor = collection.find(query, { tailable: true }).sort({ '$natural': 1 });

            (function next() {
                process.nextTick(function() {
                    cursor.nextObject(function(err, doc) {
                        if (err) return callback(err);
                        if (doc) callback(null, doc);
                        if (subscribed) next();
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