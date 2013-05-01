var mongo = require('mongoskin');
var Channel = require('./channel');

module.exports = Connection;

function Connection(uri, options) {
    this.db = uri.collection ? uri : mongo.db(uri, options);
    this.channels = {};

    this.__defineGetter__('state', function() {
        return this.db.db.state;
    });
}

Connection.prototype.disconnected = function() {
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
