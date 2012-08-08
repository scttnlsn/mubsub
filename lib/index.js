var Connection = require('./connection');

module.exports = function(uri, options) {
    return new Connection(uri, options);
};