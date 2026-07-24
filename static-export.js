#!/usr/bin/env node

// Crawls every public route this app's Express server renders and writes
// the responses to `.static/`, alongside a full copy of the built `os-app`
// asset tree (which Express serves as-is), producing a self-contained
// static site suitable for GitHub Pages.

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const kRootDirectory = __dirname;
const kOutputDirectory = path.join(kRootDirectory, '.static');
const kPort = process.env.PORT || '3000';
const kBaseURL = `http://localhost:${ kPort }`;

const OLSKStaticExportDiscoverRoutes = function () {
	const controllerFiles = [];

	(function walk(directory) {
		for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
			if (entry.name.startsWith('__') || entry.name === 'node_modules') {
				continue;
			}

			const fullPath = path.join(directory, entry.name);

			if (entry.isDirectory()) {
				walk(fullPath);
				continue;
			}

			if (entry.name === 'controller.js') {
				controllerFiles.push(fullPath);
			}
		}
	})(path.join(kRootDirectory, 'os-app'));

	return controllerFiles.reduce(function (coll, filePath) {
		const controllerModule = require(filePath);

		if (typeof controllerModule.OLSKControllerRoutes !== 'function') {
			return coll;
		}

		const routesResult = controllerModule.OLSKControllerRoutes();
		const routesArray = Array.isArray(routesResult) ? routesResult : Object.values(routesResult);

		return coll.concat(routesArray.filter(function (route) {
			return (route.OLSKRouteMethod || 'get') === 'get'
				&& !route.OLSKRouteRedirect
				&& !route.OLSKRouteIsHidden
				&& !route.OLSKRoutePath.startsWith('/stub/');
		}));
	}, []);
};

const OLSKStaticExportURLsForRoute = function (route) {
	const basePath = route.OLSKRoutePath;
	const languageCodes = Array.isArray(route.OLSKRouteLanguageCodes) ? route.OLSKRouteLanguageCodes : [];

	// Pages link to explicit `/en/...` alternates (hreflang) even though the
	// unprefixed path is the canonical default, so both must be crawled.
	return [basePath].concat(languageCodes.map(function (languageCode) {
		return basePath === '/' ? `/${ languageCode }` : `/${ languageCode }${ basePath }`;
	}));
};

const OLSKStaticExportDestinationForURL = function (urlPath) {
	if (urlPath === '/') {
		return path.join(kOutputDirectory, 'index.html');
	}

	if (/\.[a-zA-Z0-9]+$/.test(urlPath)) {
		return path.join(kOutputDirectory, urlPath);
	}

	return path.join(kOutputDirectory, urlPath, 'index.html');
};

const OLSKStaticExportFetch = function (urlPath) {
	return new Promise(function (resolve, reject) {
		http.get(`${ kBaseURL }${ urlPath }`, function (response) {
			if (response.statusCode >= 300 && response.statusCode < 400) {
				response.resume();
				return resolve(null);
			}

			if (response.statusCode !== 200) {
				response.resume();
				return reject(new Error(`GET ${ urlPath } -> ${ response.statusCode }`));
			}

			const chunks = [];
			response.on('data', function (chunk) {
				chunks.push(chunk);
			});
			response.on('end', function () {
				resolve(Buffer.concat(chunks));
			});
		}).on('error', reject);
	});
};

const OLSKStaticExportWaitForServer = async function () {
	for (let attempt = 0; attempt < 120; attempt++) {
		try {
			await OLSKStaticExportFetch('/robots.txt');
			return;
		} catch (error) {
			await new Promise(function (resolve) {
				setTimeout(resolve, 500);
			});
		}
	}

	throw new Error('Server did not become ready in time');
};

const OLSKStaticExportCopyBuiltAssets = function () {
	fs.cpSync(path.join(kRootDirectory, 'os-app'), kOutputDirectory, {
		recursive: true,
	});
};

const OLSKStaticExportMain = async function () {
	fs.rmSync(kOutputDirectory, { recursive: true, force: true });
	fs.mkdirSync(kOutputDirectory, { recursive: true });

	OLSKStaticExportCopyBuiltAssets();

	const urls = Array.from(OLSKStaticExportDiscoverRoutes().reduce(function (coll, route) {
		OLSKStaticExportURLsForRoute(route).forEach(function (url) {
			coll.add(url);
		});

		return coll;
	}, new Set(['/robots.txt', '/manifest.json', '/sw.js'])));

	const server = spawn('npm', ['start'], {
		cwd: kRootDirectory,
		env: Object.assign({}, process.env, { PORT: kPort }),
		stdio: 'inherit',
		detached: true,
	});

	try {
		await OLSKStaticExportWaitForServer();

		for (const urlPath of urls) {
			const body = await OLSKStaticExportFetch(urlPath);

			if (body === null) {
				console.warn(`skipped (redirect) ${ urlPath }`);
				continue;
			}

			const destinationPath = OLSKStaticExportDestinationForURL(urlPath);
			fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
			fs.writeFileSync(destinationPath, body);
			console.log(`saved ${ urlPath } -> ${ path.relative(kRootDirectory, destinationPath) }`);
		}
	} finally {
		// `npm start` forks its own child process, so kill the whole group.
		process.kill(-server.pid, 'SIGTERM');
	}
};

OLSKStaticExportMain().then(function () {
	process.exit(0);
}, function (error) {
	console.error(error);
	process.exit(1);
});
