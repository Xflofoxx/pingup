"use strict";
/**
 * @author Dario Olivini
 * @copyright 2016 Dario Olivini. All rights reserved.
 * See LICENSE file in root directory for full license.
 */

var _PingupServer = require("./src/PingupServer");

var _PingupServer2 = _interopRequireDefault(_PingupServer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const server = new _PingupServer2.default({ host: "localhost", port: "8080" });

server.start().then(() => {
    console.log(`Server is running at http://${ server.infos.get("host") }:${ server.infos.get("port") }`);
}).catch(err => {
    console.error(`Something blow up!${ err.message }`, err.stack);
});

//# sourceMappingURL=index.js.map