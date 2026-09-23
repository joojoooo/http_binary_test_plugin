# Nuvio binary `fetch()` reproduction

This installable Nuvio plugin checks whether the plugin runtime preserves a
five-byte `Uint8Array` request body and exposes `response.arrayBuffer()`.

The probe sends `00 01 7f 80 ff` to HTTPBingo. HTTPBingo returns the received
body as URL-safe Base64, so the plugin never needs to display raw binary.

## Install and run in Nuvio

1. Open **Settings > Content & Discovery > Plugins > Add Repository** and install:

   ```text
   https://raw.githubusercontent.com/joojoooo/http_binary_test_plugin/refs/heads/main/manifest.json
   ```

2. Enable the **Binary fetch reproduction** provider and use its **Test Provider** button in Nuvio plugin settings.

3. The test returns one stream. Its name, title, and URL contain the same summary. Use **Copy stream link** to copy it. On an affected runtime it is:

```text
MISMATCH | expected: AAF_gP8= | received: VUJ5dGVBcnJheShzdG9yYWdlPVswLCAxLCAxMjcsIC0xMjgsIC0xXSk= | arrayBufferType: undefined
```

   `AAF_gP8=` is the URL-safe Base64 encoding of `00 01 7f 80 ff`. The observed `received` value decodes to `UByteArray(storage=[0, 1, 127, -128, -1])`, proving that the native array representation was sent as text. The exact broken representation may vary by runtime version but any `received` value other than `AAF_gP8=` is a failure

## Compare with Node.js

Run the exact same probe outside Nuvio with Node.js 18+ and compare the results:

```shell
npm test
```

   Node reports:

```text
MATCH | expected: AAF_gP8= | received: AAF_gP8= | arrayBufferType: function
```

The Node script imports `runBinaryProbe()` directly from the provider, so the endpoint, request options, `Uint8Array`, and probe code are identical. Comparing the two summary strings isolates the Nuvio runtime boundary.

## Files

- `manifest.json` — installable Nuvio repository manifest.
- `providers/binary-fetch-repro.js` — minimal provider and shared probe.
- `scripts/run-node-comparison.js` — Node entry point for the shared probe.
