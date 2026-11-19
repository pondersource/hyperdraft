const kDefaultRoute = require('./controller.js').OLSKControllerRoutes().shift();

const uLocalized = function (inputData) {
	return OLSKTestingLocalized(inputData, 'en');
};

describe('KVCWrite_Cloud', function () {

	describe('OLSKAppToolbar', function test_OLSKAppToolbar() {

		before(function () {
			return browser.OLSKVisit(kDefaultRoute);
		});

		before(function () {
			return browser.OLSKLauncherRun('ZDRLauncherItemFakeDispatchConnected');
		});

		before(function () {
			return browser.OLSKLauncherRun('ZDRLauncherItemFakeDispatchOnline');
		});

		it('sets OLSKAppToolbarCloudOffline', function () {
			browser.assert.text('.OLSKAppToolbarCloudStatus', uLocalized('OLSKAppToolbarCloudStatusOnline'));
		});

		context('offline', function () {

			before(function () {
				return browser.OLSKLauncherRun('ZDRLauncherItemFakeDispatchOffline');
			});

			it('sets OLSKAppToolbarCloudOffline', function () {
				browser.assert.text('.OLSKAppToolbarCloudStatus', uLocalized('OLSKAppToolbarCloudStatusOffline'));
			});
		
		});

		context('error', function () {

			before(function () {
				return browser.OLSKLauncherRun('ZDRLauncherItemFakeDispatchError');
			});

			it('sets OLSKAppToolbarCloudError', function () {
				browser.assert.text('.OLSKAppToolbarCloudStatus', uLocalized('OLSKAppToolbarCloudStatusError'));
			});
		
		});
	
	});

	describe('remoteStorage widget', function () {
		before(async function () {
			await browser.OLSKVisit(kDefaultRoute);
			await browser.pressButton('.OLSKAppToolbarCloudButton');
		});

		it('offers all four backends in one widget', function () {
			for (const provider of ['rs', 'dropbox', 'googledrive', 'solid']) {
				browser.assert.elements('.rs-choose-' + provider, 1);
			}
			browser.assert.elements('[data-pondersource-solid]', 0);
		});

		it('opens the Solid identity provider form', async function () {
			await browser.pressButton('.rs-choose-solid');
			browser.assert.elements('.rs-state-solid', 1);
			browser.assert.elements('input[name=rs-provider-address]', 1);
		});

		it('shows connected identity and sync status from rs.js', async function () {
			this.timeout(5000);
			browser.evaluate(`(() => {
				const rs = Main.$$.ctx[0]._ValueZDRWrap.ZDRStorageClient();
				rs.remote.userAddress = 'widget-test@example.test';
				rs._emit('connected');
				rs._emit('sync-done', { completed: true });
			})()`);
			await browser.wait();
			browser.assert.text('.rs-user', 'widget-test@example.test');
			browser.assert.text('.rs-box-connected .rs-sub-headline', 'Synced');
		});

		it('offers renewal for expired authorization without clearing notes', async function () {
			browser.evaluate(`Main.$$.ctx[0]._ValueZDRWrap.ZDRStorageClient()._emit('error', {name: 'Unauthorized', message: 'App authorization expired or revoked.'})`);
			await browser.wait();
			browser.assert.elements('.rs-state-error', 1);
			browser.assert.elements('.rs-reconnect:not(.rs-hidden)', 1);
		});

		it('disconnects through the widget without a native confirmation dialog', async function () {
			await browser.pressButton('.rs-box-error .rs-disconnect');
			await browser.wait();
			browser.assert.elements('.rs-state-choose', 1);
		});
	});
});
