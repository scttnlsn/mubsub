var assert = require('assert');
var mubsub = require('../lib/index');

describe('Channel', function() {
    var channel, client;

    beforeEach(function() {
        client = mubsub(process.env.MONGODB_URI || 'mongodb://localhost:27017/mubsub_tests');
        channel = client.channel('tests');
    });

    it('calls subscribed callbacks that match given query', function(done) {
        var counts = { all: 0, bar: 0, baz: 0, both: 0 };

        var random = function() {
            return Math.floor(Math.random() * 100 + 1);
        };

        var bar = random();
        var baz = random();
        var qux = random();

        var end = function() {
            counts.all === bar + baz + qux &&
            counts.bar === bar &&
            counts.baz === baz &&
            counts.both === bar + baz &&
            done();
        };

        channel.once('error', done);

        // Match all
        channel.subscribe({}, function(doc) {
            assert.ok(doc.foo);
            counts.all++;
            end();
        });

        // Match `bar`
        channel.subscribe({ foo: 'bar' }, function(doc) {
            assert.equal(doc.foo, 'bar');
            counts.bar++;
            end();
        });

        // Match `baz`
        channel.subscribe({ foo: 'baz' }, function(doc) {
            assert.equal(doc.foo, 'baz');
            counts.baz++;
            end();
        });

        // Match `bar` or `baz`
        channel.subscribe({ '$or': [{ foo: 'bar'}, { foo: 'baz' }]}, function(doc) {
            assert.ok(doc.foo === 'bar' || doc.foo === 'baz');
            counts.both++;
            end();
        });

        for (var i = 0; i < bar; i++) channel.publish({ foo: 'bar' });
        for (var i = 0; i < baz; i++) channel.publish({ foo: 'baz' });
        for (var i = 0; i < qux; i++) channel.publish({ foo: 'qux' });
    });
});