Google Drive repair build
=========================

Source: https://github.com/remotestorage/remotestorage.js/commit/b7b4ce66ab4bbb41ee04b199027a80fbd2ac9212
Upstream review: https://github.com/remotestorage/remotestorage.js/pull/1436

Built with npm ci, npm run build:js and npm run build:release. The archive contains the production release bundle and declarations, MIT license, README and package metadata. Version 2.0.0-beta.10-pondersource.4 identifies this pinned deployment build; no npm registry release is implied.

Fixes Google upload completion, missing-file reads, folder changes, pagination and stale path caches. Upstream validation: 524 Mocha tests plus legacy suites; live provider tests run against PonderSource deployments.

Also preserves the legacy directory mappings on existing Drive accounts and ignores incompatible personal filenames outside that root.

Retries reads invalidated by change tracking startup, preventing a false network failure on first connection.
