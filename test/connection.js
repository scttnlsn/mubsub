var assert = require('assert');
var mubsub = require('../lib/index');
var uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mubsub_tests';

describe('Connection', function() {
    function clear(done) {
        mubsub(uri).on('connect', function(db) {
            db.dropDatabase(done);
        });
    }
    beforeEach(clear);
    after(clear);

    it('emits "error" event', function(done) {
        mubsub('mongodb://localhost:6666/mubsub_tests').on('error', function() {
            done();
        });
    });

    it('emits "connect" event', function(done) {
        mubsub(uri).on('connect', function(db) {
            done();
        });
    });

    it('states are correct', function(done) {
        var client = mubsub(uri);

        client.on('connect', function() {
            assert.equal(client.state, 'connected');
            client.close();
            assert.equal(client.state, 'destroyed');
            done();
        });

        assert.equal(client.state, 'connecting');
    });
});
