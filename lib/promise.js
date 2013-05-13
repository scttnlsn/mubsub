/**
 * Promise constructor.
 *
 * @param {Object} context
 * @api private
 */
function Promise(context) {
    this.context = context || this;
    this.callbacks = [];
    this.resolved = undefined;
}

module.exports = Promise;

/**
 * Define callback which is called after promise gets resolved.
 *
 * @param {Function} callback
 * @return {Promise} this
 * @api private
 */
Promise.prototype.then = function(callback) {
    if (this.resolved) {
        callback.apply(this.context, this.resolved);
    } else {
        this.callbacks.push(callback);
    }

    return this;
};

/**
 * Resolve promise - call all callbacks.
 * Arguments will be passed to the callbacks.
 *
 * @return {Promise} this
 * @api private
 */
Promise.prototype.resolve = function() {
    if (this.resolved) throw new Error('Promise already resolved');

    var callback;
    this.resolved = arguments;

    while (callback = this.callbacks.shift()) {
        callback.apply(this.context, this.resolved);
    }
};
