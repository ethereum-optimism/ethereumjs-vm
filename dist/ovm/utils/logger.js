"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScopedLogger = exports.Logger = void 0;
var debug_1 = require("debug");
var uuid_1 = require("uuid");
var Logger = /** @class */ (function () {
    function Logger(namespace) {
        this._namespace = namespace;
        this._debugger = debug_1.default(namespace);
    }
    Logger.prototype.log = function (message) {
        this._debugger(message);
    };
    Logger.prototype.scope = function (namespace, section) {
        var id = uuid_1.v4();
        return new ScopedLogger(this._namespace + ":" + namespace + ":" + id, section);
    };
    return Logger;
}());
exports.Logger = Logger;
var ScopedLogger = /** @class */ (function (_super) {
    __extends(ScopedLogger, _super);
    function ScopedLogger(namespace, section) {
        var _this = _super.call(this, namespace) || this;
        _this._section = section || namespace;
        return _this;
    }
    ScopedLogger.prototype.open = function () {
        var sectionStartMessage = "BEGIN: " + this._section;
        this.log("\n\n");
        this._logSection(sectionStartMessage);
        this.log("\n");
    };
    ScopedLogger.prototype.close = function () {
        var sectionEndMessage = "END: " + this._section;
        this.log("\n");
        this._logSection(sectionEndMessage);
        this.log("\n\n");
    };
    ScopedLogger.prototype._logSection = function (message) {
        this.log("------" + '-'.repeat(message.length) + "------");
        this.log("----- " + message + " -----");
        this.log("------" + '-'.repeat(message.length) + "------");
    };
    return ScopedLogger;
}(Logger));
exports.ScopedLogger = ScopedLogger;
//# sourceMappingURL=logger.js.map