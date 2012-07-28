var mubsub = require('../lib/index');

mubsub.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mubsub_example');

var channel = mubsub.channel('example');

channel.subscribe(function(doc) {
    console.log(doc);
});

channel.on('error', function(err) {
    throw err;
});