// ExtendScript targets ECMAScript 3. TypeScript only downlevels syntax, not missing APIs.
// Install polyfills before any other ReOm MIDI code runs.
(function () {
    if (!Array.prototype.map) {
        Array.prototype.map = function (callbackFn, thisArg) {
            var result = [];
            var i;
            for (i = 0; i < this.length; i++) {
                result[i] = callbackFn.call(thisArg, this[i], i, this);
            }
            return result;
        };
    }

    if (!Object.keys) {
        Object.keys = function (obj) {
            var keys: string[] = [];
            var key: string;
            if (obj !== Object(obj)) {
                throw new TypeError("Object.keys called on non-object");
            }
            for (key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    keys.push(key);
                }
            }
            return keys;
        };
    }
})();
