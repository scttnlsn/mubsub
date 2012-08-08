var mubsub = require('../lib/index');

var client = mubsub(process.env.MONGODB_URI || 'mongodb://localhost:27017/mubsub_example');
var channel = client.channel('example');

channel.subscribe(function(doc) {
    console.log(doc);
});

channel.on('error', function(err) {
    console.log(err);
});