# Experimental all-backend storage preview

The app vendors the reviewed Ponder Source forks of remotestorage.js and its
widget. Preview 7 adds a durable, account-scoped NextGraph document recovery
journal and app-owned guest export/import hooks. Unknown fields, concurrent
versions and deletion records remain in recovery exports.

- core: `remotestoragejs-2.0.0-beta.10-pondersource.8-preview.7.tgz`; SHA-256
  `2ccfce4f0a50926fedfca947c9f9f52c29b77e970dcc144cb3c4d980b7e356db`; source
  `2517fe04cd66f27c430ec451167efd6b0c73393d`.
- widget: `remotestorage-widget-1.8.2-pondersource.3-preview.7.tgz`; SHA-256
  `62f3dd6c4efe0e5bcea4a8a79edb16f7dcd6cbb35660b088b444a225167440e0`; source
  `18a22cf75e54bef68620c7e6968b38fc3e4c20bf`.

Each archive includes storage-preview.json with source and artifact hashes.
The native NextGraph SDK still owns wallet connection and encrypted replication;
a local recovery commit does not prove broker receipt or two-device delivery.
Real wallet/broker and signed-in OneDrive acceptance remain outstanding. OneDrive
uses the public Ponder Source personal-account SPA registration; this app's
callback must be registered before production sign-in can succeed.

Original app formats, upstream attribution and licenses are retained. These
archives are experimental fork builds and are not published to npm.
