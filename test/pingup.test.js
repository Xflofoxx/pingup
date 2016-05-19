"use strict";
/**
 * @author Dario Olivini
 * @copyright 2016 Dario Olivini. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

var _assert = require("assert");

var _assert2 = _interopRequireDefault(_assert);

var _mocha = require("mocha");

var _mocha2 = _interopRequireDefault(_mocha);

var _PingupServer = require("../src/PingupServer");

var _PingupServer2 = _interopRequireDefault(_PingupServer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_mocha2.default.describe("Pingup", function () {
    const options = { host: "localhost", port: "8080" };
    const PKG_INFO = require("../package.json");
    const server = new _PingupServer2.default(options);

    _mocha2.default.it("Infos should contains name and version to specified port", () => {
        _assert2.default.equal(server.infos.get("host"), options.host);
        _assert2.default.equal(server.infos.get("port"), options.port);
        _assert2.default.equal(server.infos.get("appname"), PKG_INFO.name);
        _assert2.default.equal(server.infos.get("version"), PKG_INFO.version);
    });
    _mocha2.default.it("Should expone name and version form package.json");
});

//# sourceMappingURL=pingup.test.js.map