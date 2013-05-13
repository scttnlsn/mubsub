var assert = require('assert');
var mubsub = require('../lib/index');
var data = require('./fixtures/data');
var uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mubsub_tests';

describe('Channel', function() {
    var client, channel;

    function clear(done) {
        mubsub(uri).on('connect', function(db) {
            if (client) client.close();
            db.dropDatabase(done);
        });
    }

    beforeEach(function(done) {
        clear(function() {
            client = mubsub(uri);
            channel = client.channel('channel');
            done();
        });
    });

    after(clear);

    it('unsubscribes properly', function(done) {
        var amount = 0;

        var subscription = channel.subscribe('a', function(data) {
            amount++;
            assert.equal(data, 'a');
            subscription.unsubscribe();
        });

        channel.publish('a', 'a');
        channel.publish('a', 'a');
        channel.publish('a', 'a');

        setTimeout(function() {
            assert.equal(amount, 1);
            done();
        }, 500);
    });

    it('unsubscribes if channel is closed', function(done) {
        var amount = 0;

        var subscription = channel.subscribe('a', function(data) {
            assert.equal(data, 'a');
            amount++;
            channel.close();
        });

        channel.publish('a', 'a');
        channel.publish('a', 'a');
        channel.publish('a', 'a');
        setTimeout(function() {
            assert.equal(amount, 1);
            done();
        }, 500);
    });

    it('unsubscribes if client is closed', function(done) {
        var amount = 0;

        var subscription = channel.subscribe('a', function(data) {
            assert.equal(data, 'a');
            amount++;
            client.close();
        });

        channel.publish('a', 'a');
        channel.publish('a', 'a');
        channel.publish('a', 'a');
        setTimeout(function() {
            assert.equal(amount, 1);
            done();
        }, 500);
    });

    it('can subscribe and publish different data', function(done) {
        var todo = 3;
        var subscriptions = [];

        function complete() {
            todo--;
            if (!todo) {
                subscriptions.forEach(function(subscriptions) {
                    subscriptions.unsubscribe();
                });
                done();
            }
        }

        subscriptions.push(channel.subscribe('a', function(data) {
            assert.equal(data, 'a');
            complete();
        }));

        subscriptions.push(channel.subscribe('b', function(data) {
            assert.deepEqual(data, {b: 1});
            complete();
        }));

        subscriptions.push(channel.subscribe('c', function(data) {
            assert.deepEqual(data, ['c']);
            complete();
        }));

        channel.publish('a', 'a');
        channel.publish('b', {b: 1});
        channel.publish('c', ['c']);
    });

    it('gets lots of subscribed data fast enough', function(done) {
        var channel = client.channel('channel.bench', {size: 1024 * 1024 * 100});
        var got = 0;
        var publish = 5000;

        // Takes about 2 sec on mb air.
        this.timeout(4000);

        var subscription = channel.subscribe('a', function(_data) {
            assert.deepEqual(_data, data);

            got++;
            if (got == publish) {
                subscription.unsubscribe();
                done();
            }
        });

        for(var i = 0; i < publish; i++) {
            channel.publish('a', data);
        }
    });
});
