var mongo = require('mongodb');
var url = require('url');
var Channel = require('./channel');
var Promise = require('./promise');

module.exports = Connection;

function Connection(options) {
    this.db = new Promise();
    this.channels = {};
    this.readyState = 0;
}

Connection.prototype.channel = function(name, options) {
    if (!this.channels[name] || this.channels[name].closed) {
        this.channels[name] = new Channel(name, this.db, options);
    }

    return this.channels[name];
};

Connection.prototype.open = function(options, callback) {
    var self = this;
    var options = parseOptions(options);
    var db = options.db;

    this.readyState = 2;

    if (typeof db === 'string') {
        var server = new mongo.Server(options.host, options.port, options.options);
        db = new mongo.Db(db, server);
    }

    db.open(function(err, db) {
        if (err) {
            console.error(err);
            process.exit();
        }
        var opened = function() {
            self.db.resolve(err, db);
            self.readyState = 1;
            callback && callback(err, db);
        };

        if (options.user && options.pass) {
            db.authenticate(options.user, options.pass, opened)
        } else {
            opened();
        }
    });
};

Connection.prototype.close = function(callback) {
    var self = this;

    callback || (callback = function() {});

    switch (this.readyState) {
        case 0: // disconnected
        case 3: // disconnecting
            callback(null);
            break;

        case 1: // connected
        case 2: // connecting
            this.doClose(callback);
            break;
    }
};

Connection.prototype.doClose = function(callback) {
    var self = this;

    this.readyState = 3;

    this.db.then(function(err, db) {
        if (err) return callback(err);

        for (var name in self.channels) {
            self.channels[name].close();
        }
        self.channels = {};
        self.db = new Promise();

        db.close();
        self.readyState = 0;
        callback(null);
    });
};

// Helpers
// ---------------

function parseOptions(options) {
    if (typeof options === 'string') {
        options = { url: options };
    } else {
        options || (options = {});
    }

    if (options.url) {
        var uri = url.parse(options.url);
        options.host = uri.hostname;
        options.port = parseInt(uri.port, 10) || 27017;
        options.db = uri.pathname && uri.pathname.replace(/\//g, '');

        if (uri.auth) {
            var auth = uri.auth.split(':');
            options.user = auth[0];
            options.pass = auth[1];
        }
    } else {
        options.host || (options.host = 'localhost');
        options.port || (options.port = 27017);
    }

    if (options.db === undefined) {
        throw new Error('No `db` specified');
    }

    return options;
};