mubsub
======

Mubsub is a pub/sub implementation for Node.js and MongoDB.  It utilizes Mongo's capped collections and tailable cursors to notify subscribers of inserted documents that match a given query.

Example
-------

```javascript
var mubsub = require('mubsub');
var channel = mubsub.channel('test');

mubsub.connect('mongodb://localhost:27017/mubsub');

channel.subscribe({ foo: 'bar' }, function(err, doc) {
    console.log('received bar');
});

channel.subscribe({ foo: 'baz' }, function(err, doc) {
    console.log('received baz');
});

channel.publish({ foo: 'bar' });
channel.publish({ foo: 'baz' });

```

Usage
-----

### Channels ###

A channel maps one-to-one with a capped collection (Mubsub will create these if they do not already exist in the database).  Optionally specify the byte size of the collection or/and max number of documents in the collection when creating a channel:

```javascript
var channel = mubsub.channel('foo', { size: 100000, max: 500 });
```

### Subscribe ###

```javascript
var subscription = channel.subscribe(query, callback);
```

Subscriptions register a callback to be called whenever a document matching the specified query is inserted (published) into the collection (channel).  You can omit the query to match all inserted documents.  To later unsubscribe a particular callback, call `unsubscribe` on the returned subscription object:

```javascript
subscription.unsubscribe();
```

### Publish ###

```javascript
channel.publish(doc, callback);
```

Publishing a document simply inserts the document into the channel's capped collection.  Note that Mubsub will remove any specified document `_id` as the natural ordering of `ObjectId`s is used to ensure subscribers do not receive notifications of documents inserted in the past.  Callback is optional.

### Disconnect ###

Disconnect will happen as soon as connection gets opened.

```javascript
mubsub.disconnect();
```

Install
-------

    npm install mubsub

Tests
-----

    make test

You can optionally specify the MongoDB URI to be used for tests:

    MONGODB_URI=mongodb://localhost:27017/mubsub_tests make test