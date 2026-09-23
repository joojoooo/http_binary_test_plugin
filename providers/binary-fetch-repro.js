function runBinaryProbe() {
  var bytes = new Uint8Array([0x00, 0x01, 0x7f, 0x80, 0xff]);
  var EXPECTED = "AAF_gP8="; // URL-safe Base64 for 00 01 7f 80 ff
  var ENDPOINT = "https://httpbingo.org/anything"; // https://github.com/mccutchen/go-httpbin
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: bytes
  }).then(function (response) {
    return response.json().then(function (body) {
      var received = body.data.split(",")[1];
      return (EXPECTED === received ? "MATCH" : "MISMATCH") + " | expected: " + EXPECTED + " | received: " + received + " | arrayBufferType: " + typeof response.arrayBuffer;
    });
  });
}

function getStreams() {
  return runBinaryProbe().then(function (summary) {
    return [{
      name: summary,
      title: summary,
      quality: "DEBUG",
      url: summary
    }];
  });
}

module.exports = { getStreams: getStreams, runBinaryProbe: runBinaryProbe };
