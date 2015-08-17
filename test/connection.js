var assert = require('assert');
var mubsub = require('../lib/index');
var helpers = require('./helpers');

describe('Connection', function () {
    it('emits "error" event', function (done) {
        mubsub('mongodb://localhost:6666/mubsub_tests').on('error', function () {
            done();
        });
    });

    it('emits "connect" event', function (done) {
        this.client = mubsub(helpers.uri);

        this.client.on('connect', function (db) {
            done();
        });
    });


    it('states are correct', function (done) {
        var self = this;
        
        this.client = mubsub(helpers.uri);

        this.client.on('connect', function () {
            assert.equal(self.client.state, 'connected');
            
            self.client.close();
            assert.equal(self.client.state, 'destroyed');

            done();
        });

        assert.equal(self.client.state, 'connecting');
    });
});
