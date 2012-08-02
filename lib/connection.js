var mongo = require('mongodb');
var url = require('url');
var Channel = require('./channel');
var Promise = require('./promise');

module.exports = Connection;

function Connection() {
    this.db = new Promise();
    this.channels = {};
    this.state = 0;
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

    this.state = 2;

    if (typeof options.db === 'string') {
        var server = new mongo.Server(options.host, options.port, options.options);
        db = new mongo.Db(db, server);
    }

    var done = function(err, db) {
        self.state = err ? 0 : 1;
        self.db.resolve(err, db);
        callback && callback(err, db);
    };

    if (db.state === 'connected') return done(null, db);

    db.open(function(err, db) {
        if (err) return done(err);

        if (options.user && options.pass) {
            db.authenticate(options.user, options.pass, function(err) {
                if (err) return done(err);
                done(null, db);
            });
        } else {
            done(null, db);
        }
    });
};

Connection.prototype.close = function(callback) {
    var self = this;

    callback || (callback = function() {});

    switch (this.state) {
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

    this.state = 3;

    this.db.then(function(err, db) {
        if (err) return callback(err);

        for (var name in self.channels) {
            self.channels[name].close();
        }
        self.channels = {};
        self.db = new Promise();

        db.close();
        self.state = 0;
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
        options.port = parseInt(uri.port, 10);
        options.db = uri.pathname && uri.pathname.replace(/\//g, '');

        if (uri.auth) {
            var auth = uri.auth.split(':');
            options.user = auth[0];
            options.pass = auth[1];
        }
    }
    
    options.host || (options.host = 'localhost');
    options.port || (options.port = 27017);

    if (options.db === undefined) {
        throw new Error('No `db` specified');
    }

    return options;
};