"use strict";
/**
 * @author Dario Olivini
 * @copyright 2016 Dario Olivini. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
    const PKG_INFO = require("../package.json");

class Pingup{
    constructor(options) {
        this.version = PKG_INFO.version;
        this.name = PKG_INFO.name;
    }

    printName() {
        console.log(this.name);
    }
};

module.exports = Pingup;