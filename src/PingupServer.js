"use strict";
/**
 * @author Dario Olivini
 * @copyright 2016 Dario Olivini. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _express = require("express");

var _express2 = _interopRequireDefault(_express);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const PKG_INFO = require("../package.json");

class PingupServer {

    constructor(options) {
        this._infos = new Map();

        this.infos.set("version", PKG_INFO.version);
        this.infos.set("appname", PKG_INFO.name);
        this.infos.set("host", options.host || "127.0.0.1");
        this.infos.set("port", options.port || 3000);

        this._app = (0, _express2.default)();
    }

    get infos() {
        return this._infos;
    }

    start() {
        return new Promise(resolve => {
            this._app.listen(this.infos.get("port"), resolve);
        });
    }
}
exports.default = PingupServer;

//# sourceMappingURL=PingupServer.js.map