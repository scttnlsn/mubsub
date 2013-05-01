mubsub
======

Mubsub is a pub/sub implementation for Node.js and MongoDB.  It utilizes Mongo's capped collections and tailable cursors to notify subscribers of inserted documents that match a given query.

Example
-------

```javascript
var mubsub = require('mubsub');

var client = mubsub('mongodb://localhost:27017/mubsub_example');
var channel = client.channel('test');

channel.subscribe({ foo: 'bar' }, function(doc) {
    console.log(doc.foo); // => 'bar'
});

channel.subscribe({ foo: 'baz' }, function(doc) {
    console.log(doc.foo); // => 'baz'
});

channel.publish({ foo: 'bar' });
channel.publish({ foo: 'baz' });

```

### Caveats

1. Ensure using poolSize > 1. Waiting for data will block 1 connection per subscription.

    ```javascript
    var client = mubsub('mongodb://localhost:27017/mubsub_example?poolSize=5');
    ```

2. Ensure setting auto_reconnect=true, default is false.

    ```javascript
    var client = mubsub('mongodb://localhost:27017/mubsub_example?auto_reconnect=true');
    ```

3. Avoid making lots of subscriptions. Use `channel.subscribe` less times than defined poolSize. Also at least one connection should be always free for publishing.

Usage
-----
### Create a client

```javascript
var mubsub = require('mubsub');

// Using uri
var client = mubsub('mongodb://localhost:27017/mubsub_example');

// Pass mongodb driver `Db` instance directly.
var client = mubsub(new Db(...));
```

### Channels ###

A channel maps one-to-one with a capped collection (Mubsub will create these if they do not already exist in the database).  Optionally specify the byte size of the collection or/and max number of documents in the collection when creating a channel:

```javascript
var channel = client.channel('foo', { size: 100000, max: 500 });
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

### Close ###

```javascript
client.close();
```

Closes the MongoDB connection.

### Events ###

```javascript
channel.on('error', function(err) {
    console.log(err);
});
```


Install
-------

    npm install mubsub

Tests
-----

    make test

You can optionally specify the MongoDB URI to be used for tests:

    MONGODB_URI=mongodb://localhost:27017/mubsub_tests make test
