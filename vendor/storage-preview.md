# Experimental all-backend storage preview

Preview 11 adds the OneDrive, Linked Web Storage, AtomicServer and NextGraph
provider icons. The NextGraph wallet server defaults to
https://nextgraph.net. The same selected origin receives wallet consent and SDK
requests. The choice survives the iframe handoff and the guest-export flow.

- core: `remotestoragejs-2.0.0-beta.10-pondersource.9-preview.9.tgz`; SHA-256
  `60ae5c01cf5bedf51651f5e0743cc5399b3ea32fdbbdd52a228b3532833902a8`; source
  `47cf02b312902298efcbfc8c7c6cd1bfb637e11c`.
- widget: `remotestorage-widget-1.8.2-pondersource.6-preview.11.tgz`; SHA-256
  `89b848d3ce4c8b023dd367fbfd6497a2e0b21b9416242dfb2cff2482610342ac`; source
  `bce15da652105ddfcface5463b31468559b7c356`.

Archives include source and artifact provenance. Existing document formats,
licenses, scope modules and durable recovery are retained. Real wallet/broker,
two-device/offline and signed-in OneDrive acceptance remain separate.
These are experimental fork builds and are not published to npm.

The wallet form remains visible after the mobile provider list collapses.
