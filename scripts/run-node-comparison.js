#!/usr/bin/env node

/* Runs the exact probe function used by the Nuvio provider under Node.js. */
var probe = require("../providers/binary-fetch-repro.js");

probe.runBinaryProbe().then(function (summary) {
  console.log(summary);
}).catch(function (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
