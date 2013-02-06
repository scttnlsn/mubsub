var assert = require('assert');
var sinon = require('sinon');
var mubsub = require('../lib/index');

function test_callbacks (channel, done) {
    var subscriptions = [];
    var counts = { all: 0, bar: 0, baz: 0, both: 0 };

    var random = function() {
        return Math.floor(Math.random() * 100 + 1);
    };

    var bar = random() %30;
    var baz = random() %30;
    var qux = random() %30;

    var end = function() {
        var exit = counts.all === bar + baz + qux &&
            counts.bar === bar &&
            counts.baz === baz &&
            counts.both === bar + baz;

        if (exit) {
            subscriptions.forEach(function(subscription) {
                subscription.unsubscribe();
            });
            done();
        }
    };

    channel.once('error', done);

    // Match all
    subscriptions.push(channel.subscribe({}, function(doc) {
        assert.ok(doc.foo);
        counts.all++;
        end();
    }));

    // Match `bar`
    subscriptions.push(channel.subscribe({ foo: 'bar' }, function(doc) {
        assert.equal(doc.foo, 'bar');
        counts.bar++;
        end();
    }));

    // Match `baz`
    subscriptions.push(channel.subscribe({ foo: 'baz' }, function(doc) {
        assert.equal(doc.foo, 'baz');
        counts.baz++;
        end();
    }));

    // Match `bar` or `baz`
    subscriptions.push(channel.subscribe({ '$or': [{ foo: 'bar'}, { foo: 'baz' }]}, function(doc) {
        assert.ok(doc.foo === 'bar' || doc.foo === 'baz');
        counts.both++;
        end();
    }));

    for (var i = 0; i < bar; i++) channel.publish({ foo: 'bar' });
    for (var i = 0; i < baz; i++) channel.publish({ foo: 'baz' });
    for (var i = 0; i < qux; i++) channel.publish({ foo: 'qux' });
};

describe('MongoSkin', function() {
    var channel, client;

    it('calls subscribed callbacks that match given query with URI', function(done) {
        client = mubsub(process.env.MONGODB_URI || 'mongodb://localhost:27017/mubsub_tests',
                        {safe: true});
        channel = client.channel('tests');
        test_callbacks (channel, done);
    });

    it('calls subscribed callbacks that match given query with DBNAME', function(done) {
        client = mubsub(process.env.MONGODB_DBNAME || 'mubsub_tests',
                        {safe: true});
        channel = client.channel('tests');
        test_callbacks (channel, done);
    });

    it('calls subscribed callbacks that match given query with DB', function(done) {
        var mongo = require('mongoskin');

        var dbname = process.env.MONGODB_DBNAME || 'mubsub_tests';
        var db = mongo.db('localhost:27017/' + dbname + '?auto_reconnect', {safe:true});

        client = mubsub(db, {safe: true});
        channel = client.channel('tests');
        test_callbacks (channel, done);
    });
});
