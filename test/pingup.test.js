"use strict";

/**
 * @author Dario Olivini
 * @copyright 2016 Dario Olivini. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
const assert = require("assert");
const mocha = require("mocha");
const PingupServer = require("../src/PingupServer");

mocha.describe("Pingup", () => {
    const options = {host: "localhost", port: "8080"};
    const PKG_INFO = require("../package.json");
    const server = new PingupServer(options);

    mocha.it("Infos should contains name and version to specified port", () => {
        assert.equal(server.infos.get("host"), options.host);
        assert.equal(server.infos.get("port"), options.port);
        assert.equal(server.infos.get("appname"), PKG_INFO.name);
        assert.equal(server.infos.get("version"), PKG_INFO.version);
    });
    mocha.it("Should expone name and version form package.json");
});
