# Experimental all-backend storage preview

Preview 10 adds a selectable NextGraph wallet server, defaulting to
https://nextgraph.net. The same selected origin receives wallet consent and SDK
requests. The choice survives the iframe handoff and the guest-export flow.

- core: `remotestoragejs-2.0.0-beta.10-pondersource.9-preview.9.tgz`; SHA-256
  `60ae5c01cf5bedf51651f5e0743cc5399b3ea32fdbbdd52a228b3532833902a8`; source
  `47cf02b312902298efcbfc8c7c6cd1bfb637e11c`.
- widget: `remotestorage-widget-1.8.2-pondersource.5-preview.10.tgz`; SHA-256
  `653c25a10b79190b936649f07f6b6c71c1f44cddf1ba9441c66e3eec215ab0f6`; source
  `14acf28d44851a5984dbfa91ba71e35a5b3a0b79`.

Archives include source and artifact provenance. Existing document formats,
licenses, scope modules and durable recovery are retained. Real wallet/broker,
two-device/offline and signed-in OneDrive acceptance remain separate.
These are experimental fork builds and are not published to npm.

The wallet form remains visible after the mobile provider list collapses.
