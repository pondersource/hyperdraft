const assert = require('assert');
const ZDR = require('zerodatawrap');

describe('Dropbox JSON reads', function () {
  function reader(data, options = {}) {
    return ZDR._ZDRClientInterface({ getFile: async () => ({ data }) }, ZDR.ZDRProtocolRemoteStorage(), options);
  }
  it('accepts the parsed object returned by rs.js Dropbox downloads', async function () {
    const note = { KVCNoteBody: 'Dropbox fixture' };
    assert.deepStrictEqual(await reader(note).ClientReadObject('note/main'), note);
  });
  it('continues to parse JSON text from the local cache', async function () {
    assert.deepStrictEqual(await reader('{"KVCNoteBody":"local fixture"}').ClientReadObject('note/main'), { KVCNoteBody: 'local fixture' });
  });
  it('still applies date restoration to parsed objects', async function () {
    const client = reader({ date: '2026-11-18T00:00:00.000Z' }, {
      _ZDRParamDispatchJSONPostParse: value => ({ date: new Date(value.date) })
    });
    assert.ok((await client.ClientReadObject('note/main')).date instanceof Date);
  });
  it('preserves invalid-JSON errors', async function () {
    await assert.rejects(reader('not JSON').ClientReadObject('note/main'), SyntaxError);
  });
});
