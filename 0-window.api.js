
exports.forLib = function (LIB) {

    var exports = {};

    exports.forContexts = function (contexts) {

        var exports = {};

        var Context = exports.Context = function (defaults) {
            var self = this;

            var state = {
            };
            LIB._.merge(state, LIB._.cloneDeep(defaults));

            self.config = defaults;


        }
        Context.prototype = Object.create(LIB.EventEmitter.prototype);
        Context.prototype.contexts = contexts;

        return exports;
    }

    // TODO: Load adapters as needed on demand

    exports.adapters = {
        zerosystem: require("./for/zerosystem/0-window.api").forLib(LIB)
    }

    return exports;
}
