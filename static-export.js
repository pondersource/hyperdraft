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

const OLSKStaticExportFindRollupModuleDirectories = function () {
	const moduleDirectories = [];

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

			if (entry.name === 'rollup-start.js') {
				moduleDirectories.push(directory);
			}
		}
	})(path.join(kRootDirectory, 'os-app'));

	return moduleDirectories;
};

const OLSKStaticExportCopyBuiltAssets = async function () {
	// olsk-rollup has been observed to log "created ... __compiled/..." and
	// exit for its last-built module before that module's output is fully
	// flushed to disk, so a copy taken immediately after `npm run build`
	// can silently miss it. Retry a few times before giving up loudly —
	// better to fail the deploy than ship a page missing its script/style.
	for (let attempt = 1; attempt <= 5; attempt++) {
		fs.rmSync(kOutputDirectory, { recursive: true, force: true });
		fs.cpSync(path.join(kRootDirectory, 'os-app'), kOutputDirectory, {
			recursive: true,
		});

		const missing = OLSKStaticExportFindRollupModuleDirectories().filter(function (moduleDirectory) {
			const relativePath = path.relative(path.join(kRootDirectory, 'os-app'), moduleDirectory);
			return !fs.existsSync(path.join(kOutputDirectory, relativePath, '__compiled'));
		});

		if (!missing.length) {
			break;
		}

		if (attempt === 5) {
			throw new Error(`__compiled output missing after copy for: ${ missing.join(', ') }`);
		}

		console.warn(`__compiled missing for ${ missing.join(', ') }, retrying copy (attempt ${ attempt })`);
		await new Promise(function (resolve) {
			setTimeout(resolve, 1000);
		});
	}

	// Without this, GitHub Pages treats folders like `_shared` and
	// `__compiled` as Jekyll-reserved and silently excludes them from
	// serving, 404ing every asset underneath.
	fs.writeFileSync(path.join(kOutputDirectory, '.nojekyll'), '');
};

const OLSKStaticExportMain = async function () {
	await OLSKStaticExportCopyBuiltAssets();

	const urls = Array.from(OLSKStaticExportDiscoverRoutes().reduce(function (coll, route) {
		OLSKStaticExportURLsForRoute(route).forEach(function (url) {
			coll.add(url);
		});

		return coll;
	}, new Set(['/robots.txt', '/manifest.json', '/sw.js'])));

	const server = spawn('npm', ['start'], {
		cwd: kRootDirectory,
		// NODE_ENV=production disables the dev-only livereload script
		// (OLSKExpress/main.js), which would otherwise get baked into
		// every crawled page and trip mixed-content blocking once served
		// over HTTPS.
		env: Object.assign({}, process.env, { PORT: kPort, NODE_ENV: 'production' }),
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
