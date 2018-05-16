var mubsub = require('../lib/index');

exports.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mubsub_tests';

exports.clear = function (done) {
    var self = this;

    mubsub(exports.uri).on('connect', function (db) {
        db.dropDatabase(function (err) {
            if (err) return done(err);
            if (self.client) {
                self.client.close(done);
            } else {
                done();
            }
        });
    });
};

before(function (done) {
    exports.clear.call(this, done);
});

after(function (done) {
    exports.clear.call(this, done);
});
