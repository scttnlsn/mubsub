var assert = require('assert');
var sinon = require('sinon');
var mubsub = require('../lib/index');

describe('Channel', function() {
    var channel, client;

    beforeEach(function() {
        client = mubsub(process.env.MONGODB_URI || 'mongodb://localhost:27017/mubsub_tests');
        channel = client.channel('tests');
    });

    it('calls subscribed callbacks that match given query', function(done) {
        var subscriptions = [];
        var counts = { all: 0, bar: 0, baz: 0, both: 0 };

        var random = function() {
            return Math.floor(Math.random() * 100 + 1);
        };

        var bar = random();
        var baz = random();
        var qux = random();

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
    });

    it('emits any errors', function(done) {
        var error = new Error();

        var stub = sinon.stub(channel.collection, 'then').yields(error);

        channel.on('error', function(err) {
            assert.ok(err);
            assert.equal(err, error);
            stub.restore();
            done();
        });

        channel.subscribe(function() {});
    });

    it('halts subscribe loop when disconnected', function(done) {
        // TODO: Figure out a better way to test this
        
        var count = 0;

        var subscription = channel.subscribe(function() {
            count++;

            if (count === 2) next();
            if (count > 2) done(new Error('Subscription should be ended'));
        });

        channel.publish({});
        channel.publish({});

        function next() {
            var stub = sinon.stub(client, 'disconnected').returns(true);
            
            channel.publish({}, function() {
                subscription.unsubscribe();
                stub.restore();
                setTimeout(done, 1000);
            });
        };
    });
});