var mubsub = require('../lib/index');

var client = mubsub(process.env.MONGODB_URI || 'mongodb://localhost:27017/mubsub_example');
var channel = client.channel('example');

setInterval(function() {
    channel.publish({ foo: 'bar', time: Date.now() }, function(err) {
        if (err) throw err;
    });
}, 2000);