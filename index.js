"use strict";
/**
 * @author Dario Olivini
 * @copyright 2016 Dario Olivini. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

const PingupServer = require("./src/PingupServer");

const server = new PingupServer({host: "localhost", port: "8080"});

server.start().then(() => {
    console.log(`Server is running at http://${server.infos.get("host")}:${server.infos.get("port")}`);
}).catch(err=> {
    console.error(`Something blow up!${err.message}`, err.stack);
});
