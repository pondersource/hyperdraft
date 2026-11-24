# Experimental all-backend storage preview

Preview 9 adds a selectable NextGraph wallet server, defaulting to
https://nextgraph.net. The same selected origin receives wallet consent and SDK
requests. The choice survives the iframe handoff and the guest-export flow.

- core: `remotestoragejs-2.0.0-beta.10-pondersource.9-preview.9.tgz`; SHA-256
  `60ae5c01cf5bedf51651f5e0743cc5399b3ea32fdbbdd52a228b3532833902a8`; source
  `47cf02b312902298efcbfc8c7c6cd1bfb637e11c`.
- widget: `remotestorage-widget-1.8.2-pondersource.4-preview.9.tgz`; SHA-256
  `8b1b333d5f32d6300819c7b3e37bb4bb7da3defe8e7e6a71e9bcda2e6e813817`; source
  `4857d1b236d159d9b00c2f18792851cacc70593e`.

Archives include source and artifact provenance. Existing document formats,
licenses, scope modules and durable recovery are retained. Real wallet/broker,
two-device/offline and signed-in OneDrive acceptance remain separate.
These are experimental fork builds and are not published to npm.
