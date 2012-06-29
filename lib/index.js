var Connection = require('./connection');

module.exports = new Mubsub();

function Mubsub() {
    this.connection = new Connection();
}

Mubsub.prototype.connect = function() {
    this.connection.open.apply(this.connection, arguments);
};

Mubsub.prototype.disconnect = function() {
    this.connection.close.apply(this.connection, arguments);
};

Mubsub.prototype.channel = function(name, options) {
    return this.connection.channel(name, options);
};