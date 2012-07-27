var assert = require('assert');
var mubsub = require('../lib/index');

var connect = function() {
    mubsub.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mubsub_tests')
};

var random = function() {
    return Math.floor(Math.random() * 100 + 1);
};

connect();

describe('Channel', function() {
    var channel;

    beforeEach(function() {
        channel = mubsub.channel('tests');
    });

    it('is an event emitter', function(done) {
        channel.on('foo', done);
        channel.emit('foo');
    });

    it('calls subscribed callbacks that match given query', function(done) {
        var counts = { all: 0, bar: 0, baz: 0, both: 0 };

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

    it('returns error when publishing after channel is closed', function(done) {
        channel.close();

        channel.publish({ a: 1 }, function(err) {
            assert.ok(err);
            done();
        });
    });

    it('emits error when subscribing after channel is closed', function(done) {
        channel.on('error', function(err) {
            assert.ok(err);
            done();
        });

        channel.close();

        channel.subscribe({ a: 1 }, function(doc) {
            done(new Error());
        });
    });

    it('does not emit errors after disconnect', function(done) {
        channel.on('error', function(err) {
            done(err);
        });

        channel.subscribe({ a: 1 }, function(doc) {
            done(new Error());
        });

        mubsub.disconnect();
        connect();
        done();
    });
});