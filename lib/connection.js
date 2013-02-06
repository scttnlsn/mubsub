var mongo = require('mongoskin');
var Channel = require('./channel');

module.exports = Connection;

function Connection(db, options) {
    if (typeof db == "string") {
        if (db.search('mongodb://') == 0) {
            db = mongo.db(db, {safe:false});
        } else {
            db = mongo.db('mongodb://localhost:27017/' + db + '?auto_reconnect', {safe:false});
        }
    } else {
        if (! db instanceof mongo.Db) {
            console.error ("db must be a mongo.Db or a string.");
            return new Error("wrong db object");
        }
    }

    this.db = db;
    this.channels = {};

    this.__defineGetter__('state', function() {
        return this.db.db.state;
    });
}

Connection.prototype.disconnected = function() {
    if (! this.db.db)
        return true;
    return this.db.db.state === 'disconnected';
};

Connection.prototype.channel = function(name, options) {
    if (!this.channels[name] || this.channels[name].closed) {
        this.channels[name] = new Channel(this, name, options);
    }

    return this.channels[name];
};

Connection.prototype.close = function(callback) {
    this.db.close(callback);
    return this;
};
