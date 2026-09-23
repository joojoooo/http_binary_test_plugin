### OS version

Android 14 (API 34)

### Bug description

The QuickJS plugin runtime's `fetch()` implementation does not preserve binary HTTP bodies.

When a plugin supplies an `ArrayBuffer`, `Uint8Array`, or another typed-array view as `options.body`, the value is stringified after crossing the QuickJS/native boundary. In the tested build, `new Uint8Array([0, 1, 127, 128, 255])` becomes the UTF-8 text `"UByteArray(storage=[0, 1, 127, -128, -1])"` instead of the five requested bytes `00 01 7f 80 ff`. Other runtime versions may produce a different string representation.

Binary responses have the corresponding problem. The native transport decodes response bytes into a Kotlin `String`, and the JavaScript response object only implements `.text()` and `.json()`. It does not implement `.arrayBuffer()`. Arbitrary response bytes therefore cannot be recovered, especially when they are not valid UTF-8.

This prevents plugins from using otherwise ordinary HTTP services that exchange opaque binary payloads. This is not limited to one provider or protocol. Binary-safe transport is useful for Protocol Buffers, MessagePack/CBOR, compressed request or response bodies, signed opaque envelopes, image or archive inspection, media metadata, and other byte-oriented APIs.

The failure is silent: the request is still sent, but with different bytes. Depending on the remote service, this can look like a normal 400/404 response and be misdiagnosed as a broken provider.

### Steps to reproduce

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

4. Run the exact same probe outside Nuvio with Node.js 18+ and compare the results:

   ```shell
   npm test
   ```

   Node reports:

   ```text
   MATCH | expected: AAF_gP8= | received: AAF_gP8= | arrayBufferType: function
   ```

The Node script imports `runBinaryProbe()` directly from the provider, so the endpoint, request options, `Uint8Array`, and probe code are identical. Comparing the two summary strings isolates the Nuvio runtime boundary.

### Expected behavior

- `fetch(url, { body: arrayBufferOrTypedArray })` sends the exact selected bytes, including a typed-array view's `byteOffset` and `byteLength`.
- `response.arrayBuffer()` resolves to the exact response bytes.
- `response.text()` decodes those bytes using the declared/default charset, while `response.json()` parses the decoded text.
- Existing plugins that send string bodies and consume `.text()` or `.json()` continue to work unchanged.

## Actual behavior

- The JavaScript polyfill passes `options.body` directly to `__native_fetch`.
- `FetchBridge` converts the body with `.toString()`.
- On Android, `httpRequestRaw` UTF-8-encodes that resulting string before creating the OkHttp request body.
- Native response bytes are decoded into a `String` before being returned to JavaScript.
- The JavaScript response object has no `.arrayBuffer()` method.

As a result, binary requests are changed before transmission and binary responses are lossy or inaccessible.
