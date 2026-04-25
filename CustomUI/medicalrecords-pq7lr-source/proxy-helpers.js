/*
 * Copyright 2005-2026 Hyland Software, Inc. and its affiliates. All rights reserved.
 * License rights for this program may be obtained from Hyland Software, Inc. and its affiliates.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

const { responseInterceptor } = require('http-proxy-middleware');

module.exports = {
    getDeployedAppProxy: function (processHost, deployedApps) {
        console.log(`Deployment`);
        let deployedAppProxy = {};
        if (deployedApps) {
            try {
                const appName = JSON.parse(deployedApps)[0].name;
                console.log(`Fetch app: ${appName}`);
                const appPath = `/${appName}`;
                const appPathRewrite = `^/${appName}`;
                console.log(`Target for ${appPath}: ${processHost}`);
                deployedAppProxy = {
                    [appPath]: {
                        target: `${processHost}`,
                        secure: false,
                        pathRewrite: {
                            [appPathRewrite]: appName,
                        },
                        changeOrigin: true,
                    },
                };
            } catch (e) {
                console.error(`APP_CONFIG_APPS_DEPLOYED env var contains invalid data.`);
                console.error(e.message);
            }
        }

        return deployedAppProxy;
    },
    getDeployedAppsProxy: function (processHost, deployedApps) {
        let deployedAppProxy = {};
        console.log(`Deployment`);
        if (deployedApps) {
            try {
                const deployedAppsArray = JSON.parse(deployedApps);
                for (const app of deployedAppsArray) {
                    const appName = app.name;
                    console.log(`Fetch app: ${appName}`);
                    const appPath = `/${appName}`;
                    const appPathRewrite = `^/${appName}`;
                    console.log(`Target for ${appPath}: ${processHost}`);
                    deployedAppProxy = {
                        ...deployedAppProxy,
                        [appPath]: {
                            target: `${processHost}`,
                            secure: false,
                            pathRewrite: {
                                [appPathRewrite]: appName,
                            },
                            changeOrigin: true,
                        },
                    };
                }
            } catch (e) {
                console.error(`APP_CONFIG_APPS_DEPLOYED env var contains invalid data.`);
                console.error(e.message);
            }
        }

        return deployedAppProxy;
    },
    getIdentityProxy: function (host) {
        console.log('Target for /auth', host);
        return {
            '/auth': {
                target: host,
                secure: false,
                logLevel: 'debug',
                changeOrigin: true,
            },
        };
    },
    getShareProxy: function (host) {
        console.log('Target for /alfresco', host);
        return {
            '/alfresco': {
                target: host,
                secure: false,
                logLevel: 'debug',
                changeOrigin: true,
                onProxyReq: function (request) {
                    if (request['method'] !== 'GET') request.setHeader('origin', host);
                },
                // workaround for REPO-2260
                onProxyRes: function (proxyRes, req, res) {
                    const header = proxyRes.headers['www-authenticate'];
                    if (header && header.startsWith('Basic')) {
                        proxyRes.headers['www-authenticate'] = 'x' + header;
                    }
                },
            },
        };
    },
    getApsProxy: function (host) {
        console.log('Target for /activiti-app', host);
        return {
            '/activiti-app': {
                target: host,
                secure: false,
                logLevel: 'debug',
                changeOrigin: true,
            },
        };
    },
    getMicrosoftOfficeProxy: function (host) {
        console.log('Target for /ooi-service', host);
        return {
            '/ooi-service': {
                target: host,
                secure: false,
                changeOrigin: true,
            },
        };
    },
    getDeploymentServiceProxy: function (host) {
        console.log('Target for /deployment-service', host);
        return {
            '/deployment-service': {
                target: host,
                secure: false,
                logLevel: 'debug',
                changeOrigin: true,
                ws: true,
            },
        };
    },
    getModelingServiceProxy: function (host) {
        console.log('Target for /modeling-service', host);
        return {
            '/modeling-service': {
                target: host,
                secure: false,
                logLevel: 'debug',
                changeOrigin: true,
            },
        };
    },
    getIdentityAdapterServiceProxy: function (host) {
        console.log('Target for /identity-adapter-service', host);
        return {
            '/identity-adapter-service': {
                target: host,
                secure: false,
                logLevel: 'debug',
                changeOrigin: true,
            },
        };
    },
    hxpContentRepositoryProxy(ecmHost) {
        return {
            '/api': {
                target: ecmHost,
                secure: false,
                logLevel: 'debug',
                changeOrigin: true,
                onProxyReq: function (request) {
                    request.removeHeader('origin');
                },
                configure(proxy) {
                    proxy.on('proxyReq', (request) => {
                        request.removeHeader('origin');
                    });
                },
            },
        };
    },
    getGovernanceServiceProxy: function (host) {
        console.log('Target for /cicgov/api', host);
        return {
            '/cicgov/api': {
                target: host,
                secure: false,
                logLevel: 'debug',
                changeOrigin: true,
                pathRewrite: { '^/cicgov/api': '/api' }
            },
        };
    },
    getIntelligentDocumentProcessingServiceProxy: function (host) {
        const idpPaths = [
            '/api/classification',
            '/api/extraction',
            '/api/separation',
            '/api/recognition',
            '/api/externalsource'
        ];

        console.log(`Target for HxIDP: ${idpPaths.join('|')}`, host);
        return idpPaths.reduce((acc, path) => {
            acc[path] = {
                target: host,
                secure: false,
                logLevel: 'debug',
                changeOrigin: true,
                onProxyReq: function (req) {
                    console.log(`[Proxy] ${req.url} → ${host}`);
                }
            };
            return acc;
        }, {});
    },
    getNucleusProxy: function (host) {
        console.log('Target for /graph/graphql', host);
        return {
            '/graph/graphql': {
                target: host,
                secure: false,
                logLevel: 'debug',
                changeOrigin: true,
                selfHandleResponse: false,
                onProxyRes: function (proxyRes, req, res) {
                    if (res.headersSent) {
                        return;
                    }

                    const originalWrite = res.write;
                    const originalEnd = res.end;
                    const chunks = [];

                    res.write = function (chunk) {
                        chunks.push(Buffer.from(chunk));
                        return true;
                    };

                    res.end = function (chunk) {
                        if (chunk) {
                            chunks.push(Buffer.from(chunk));
                        }

                        const body = Buffer.concat(chunks);

                        try {
                            const bodyString = body.toString('utf8');
                            const json = JSON.parse(bodyString);

                            // If the response contains subscribedApps, modify launchUrl for governance apps
                            const subscribedApps = json?.data?.currentUser?.subscribedApps;
                            if (Array.isArray(subscribedApps)) {
                                subscribedApps
                                    .filter(app => app?.app?.key === 'governance')
                                    .forEach(app => {
                                        app.launchUrl = '/cicgov';
                                    });

                                const modifiedBody = Buffer.from(JSON.stringify(json));
                                res.setHeader('content-length', modifiedBody.length);
                                originalWrite.call(res, modifiedBody);
                            } else {
                                originalWrite.call(res, body);
                            }
                        } catch (err) {
                            console.error('Error modifying /nucleus response:', err);
                            originalWrite.call(res, body);
                        }

                        originalEnd.call(res);
                    };
                },
            },
        };
    },
    getWsProxy(host) {
        console.log('Target for ^/.*notifications/v2/ws/graphql$', host);

        try {
            const path = `^/.*notifications/v2/ws/graphql$`;
            return {
                [path]: {
                    target: host,
                    ws: true,
                    secure: false,
                    logLevel: 'debug',
                    changeOrigin: true,
                },
            };
        } catch (err) {
            console.error(`Error receiving "ws" notification: ${err.message}`);
        }
    },
    getAnalyticsGraphqlProxy: function (target) {
        return {
            '/analytics': {
                target: target,
                secure: false,
                logLevel: 'debug',
                changeOrigin: true,
            },
        };
    },
};
