var assert = require('assert');
var mubsub = require('../lib/index');

function connect() {
    mubsub.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mubsub_tests')
}

connect();

var random = function() {
    return Math.floor(Math.random() * 100 + 1);
};

describe('Disconnect', function() {
    it('can not publish after channel is closed', function(next) {
        var channel = mubsub.channel('mychannel');
        channel.close();
        channel.publish({a:1}, function(err) {
            assert.notEqual(err, null);
            next();
        });
    });

    it('can not subscribe after channel is closed', function(next) {
        var channel = mubsub.channel('mychannel');
        channel.close();
        channel.subscribe({a:1}, function(err) {
            assert.notEqual(err, null);
            next();
        });
    });

    it('no errors after disconnect', function(next) {
        var channel = mubsub.channel('mychannel');

        channel.subscribe({a:1}, function(err) {
            assert.equal(err, null);
            // connect again for later tests
            connect();
            next();
        });

        mubsub.disconnect();
    });
});


describe('Channel', function() {
    var channel;

    beforeEach(function() {
        channel = mubsub.channel('tests');
    });

    it('calls subscribed callbacks that match given query', function(next) {
        var counts = { all: 0, bar: 0, baz: 0, both: 0 };

        var bar = random();
        var baz = random();
        var qux = random();

        var end = function() {
            counts.all === bar + baz + qux &&
            counts.bar === bar &&
            counts.baz === baz &&
            counts.both === bar + baz &&
            next();
        };

        // Match all
        channel.subscribe({}, function(err, doc) {
            if (err) throw err;
            assert.ok(doc.foo);
            counts.all++;
            end();
        });

        // Match `bar`
        channel.subscribe({ foo: 'bar' }, function(err, doc) {
            if (err) throw err;
            assert.equal(doc.foo, 'bar');
            counts.bar++;
            end();
        });

        // Match `baz`
        channel.subscribe({ foo: 'baz' }, function(err, doc) {
            if (err) throw err;
            assert.equal(doc.foo, 'baz');
            counts.baz++;
            end();
        });

        // Match `bar` or `baz`
        channel.subscribe({ '$or': [{ foo: 'bar'}, { foo: 'baz' }]}, function(err, doc) {
            if (err) throw err;
            assert.ok(doc.foo === 'bar' || doc.foo === 'baz');
            counts.both++;
            end();
        });

        for (var i = 0; i < bar; i++) channel.publish({ foo: 'bar' });
        for (var i = 0; i < baz; i++) channel.publish({ foo: 'baz' });
        for (var i = 0; i < qux; i++) channel.publish({ foo: 'qux' });
    });
});