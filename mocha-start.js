(function KVCMochaWrap() {
	if (process.env.OLSK_SPEC_MOCHA_INTERFACE === 'true') {
		return;
	}

	before(async function() {
		global.ZDRTestingWrap = await require('zerodatawrap').ZDRWrap({
			ZDRParamLibrary: require('remotestoragejs'),
			ZDRParamScopes: [{
				ZDRScopeKey: 'App',
				ZDRScopeDirectory: 'wikiavec',
				ZDRScopeSchemas: [
					require('./os-app/_shared/KVCNote/main.js').default,
					require('./os-app/_shared/KVCSetting/main.js').default,
					require('./os-app/_shared/KVCTransport/main.js').default,
				],
			}, {
				ZDRScopeKey: 'Public',
				ZDRScopeDirectory: 'wikiavec',
				ZDRScopeIsPublic: true,
			}],
		});
	});

	beforeEach(function() {
		return ZDRTestingWrap.App.ZDRStorageDeleteFolderRecursive('');
	});

	beforeEach(function() {
		return ZDRTestingWrap.Public.ZDRStorageDeleteFolderRecursive('');
	});
})();

(function KVCMochaStubs() {
	Object.entries({

		StubNoteObject(inputData) {
			return Object.assign({
				KVCNoteBody: Math.random().toString(),
			}, inputData);
		},

		StubNoteObjectValid(inputData) {
			return Object.assign({
				KVCNoteID: Math.random().toString(),
				KVCNoteBody: Math.random().toString(),
				KVCNoteCreationDate: new Date(),
				KVCNoteModificationDate: new Date(),
			}, inputData);
		},

		StubNoteObjectPublic(inputData = {}) {
			return Object.assign(StubNoteObjectValid({
				KVCNoteIsPublic: true,
				KVCNotePublishDate: new Date(),
				KVCNotePublicID: Math.random().toString(),
			}), inputData);
		},

		StubSettingObjectValid (inputData = {}) {
			return Object.assign({
				KVCSettingKey: Math.random().toString(),
				KVCSettingValue: Math.random().toString(),
			}, inputData);
		},
		
		uSerial (inputData) {
			return inputData.reduce(async function (coll, e) {
				return e.then(Array.prototype.concat.bind(await coll));
			}, Promise.resolve([]));
		},

		uSleep (inputData) {
			let endTime = new Date().getTime();
			while (new Date().getTime() < endTime + inputData) {}
		},
	}).map(function (e) {
		return global[e.shift()] = e.pop();
	});
})();
(function KVCZombieWebAPIs() {
	if (process.env.OLSK_SPEC_MOCHA_INTERFACE !== 'true' || process.env.OLSK_SPEC_PLAYWRIGHT === 'true' || !global.browser) return;
	// The external newsletter widget is outside the app's test fixture and
	// requires browser APIs Zombie does not implement.
	browser.pipeline.addHandler(function (browser, request) {
		if (request.url === 'https://pkg.rosano.ca/gazette/master/main.js') {
			return new (require('zombie/lib/fetch').Response)('', { status: 200 });
		}
	});
	// Zombie's old DOM lacks APIs available in the browsers this app targets.
	// Use Node's secure Web Crypto rather than relaxing identifier generation.
	browser.on('active', function (window) {
		// Each OLSKVisit starts an independent fixture; tests within that visit
		// continue sharing their state as before.
		window.localStorage.clear();
		Object.defineProperty(window, 'crypto', { value: require('crypto').webcrypto, configurable: true });
		if (!window.Element.prototype.insertAdjacentElement) {
			window.Element.prototype.insertAdjacentElement = function (position, element) {
				switch (position.toLowerCase()) {
					case 'beforebegin': this.parentNode.insertBefore(element, this); break;
					case 'afterbegin': this.insertBefore(element, this.firstChild); break;
					case 'beforeend': this.appendChild(element); break;
					case 'afterend': this.parentNode.insertBefore(element, this.nextSibling); break;
					default: throw new Error('Invalid insertion position');
				}
				return element;
			};
		}
	});
})();
