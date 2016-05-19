"use strict";
/**
 * @author Dario Olivini
 * @copyright 2016 Dario Olivini. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
import Express from "express";
const PKG_INFO = require("../package.json");

export default class PingupServer {

    constructor(options) {
        this._infos = new Map();

        this.infos.set("version", PKG_INFO.version);
        this.infos.set("appname", PKG_INFO.name);
        this.infos.set("host", options.host || "127.0.0.1");
        this.infos.set("port", options.port || 3000);

        this._app = Express();
    }

    get infos() {
        return this._infos;
    }

    start() {
        return new Promise(resolve=> {
            this._app.listen(this.infos.get("port"), resolve);
        });
    }
}

