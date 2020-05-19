module.exports = function(RED) {
    "use strict";
    // const got = require('got');
    const axios = require('axios');
    const crypto = require('crypto');
    const OAuth = require('oauth-1.0a');
    const querystring = require('querystring');
    const util = require('util');
    const FormData = require('form-data');

    const _apiBaseURL = 'https://api.tumblr.com/v2/';
    const _requestTokenURL = 'https://www.tumblr.com/oauth/request_token';
    const _accessTokenURL = 'https://www.tumblr.com/oauth/access_token';
    const _authoriseBaseURL = 'https://www.tumblr.com/oauth/authorize?oauth_token=';

    const _tokensToOauthObject = function(key, secret) {
        return { key: key, secret: secret }
    }

    const _getOAuthObject = function(consumer_key, consumer_secret) {
        const consumer_tokens = _tokensToOauthObject(consumer_key, consumer_secret);
        return new OAuth(
            {
                consumer: consumer_tokens,
                signature_method: 'HMAC-SHA1',
                hash_function(base_string, key) {
                    return crypto
                        .createHmac('sha1', key)
                        .update(base_string)
                        .digest('base64')
                }
            }
        );
    }

    const _getUserInfo = async function(oauth, access_token, access_token_secret) {
        const token = _tokensToOauthObject(access_token, access_token_secret);
        const request = {
            url: _apiBaseURL + 'user/info',
            method: 'GET'
        };
        const resp = await axios.get(request.url, {
            headers: oauth.toHeader(oauth.authorize(request, token)),
            responseType: 'json'
        });
        return resp.data.response;
    }

    function AIOTumblrConfigNode(n) {
        RED.nodes.createNode(this, n);

        // Configuration options passed by Node Red
        if (this.credentials && this.credentials.consumer_key && this.credentials.consumer_secret) {
            this.oauth = this.getOAuthObject();
        }
        else {
            this.oauth = null;
        }

        if (this.credentials && this.credentials.access_token && this.credentials.access_token_secret) {
            this.accessTokens = _tokensToOauthObject(this.credentials.access_token, this.credentials.access_token_secret);
        }
        else {
            this.accessTokens = {};
        }
    }

    AIOTumblrConfigNode.prototype.getOAuthObject = function() {
        return _getOAuthObject(this.credentials.consumer_key, this.credentials.consumer_secret);
    }

    AIOTumblrConfigNode.prototype.signedRequest = async function(method, endpoint, params = null, data = null, json= null, headers= null) {
        let request = {
           url: _apiBaseURL + endpoint,
            method: method
        };

        if (!params) {
            params = new URLSearchParams({});
        }
        if (!headers) {
            headers = {};
        }

        // TODO: Stop ignoring headers supplied by the request
        if (data) {
            // request.data = data;
            // return await got(request.url, {
            //     method: request.method,
            //     searchParams: params,
            //     headers: this.oauth.toHeader(this.oauth.authorize(request, this.accessTokens)),
            //     body: data
            // });
            // not implemented
        }
        else if (json) {
            // As observed while creating the original AIOTumblr: Since it is JSON, body apparently doesn't matter when signing
            return await axios(request.url, {
                method: request.method,
                params: params,
                headers: Object.assign(headers, this.oauth.toHeader(this.oauth.authorize(request, this.accessTokens))),
                data: json
            });
        }
        else {
            return await axios (request.url, {
                method: request.method,
                params: params,
                headers: this.oauth.toHeader(this.oauth.authorize(request, this.accessTokens)),
            });
        }
    }

    RED.nodes.registerType('aiotumblr-credentials', AIOTumblrConfigNode, {
        credentials: {
            username: { type: 'text' }, // username (main blog url) of the account connecting
            consumer_key: { type: 'text' }, // since as-is it can be used as identifier (like tumblr itself does)/is used in plaintext requests too
            consumer_secret: { type: 'password' },
            access_token: { type: 'password' },
            access_token_secret: { type: 'password' }
        }
    });

    function AIOTumblrOutNode(n) {
        RED.nodes.createNode(this, n);
        this.aioTumblrConfig = RED.nodes.getNode(n.tumblrConnection);

        if (!this.aioTumblrConfig) {
            this.warn('Config node not set');
        }

        const node = this;

        this.on('input', function(msg, send, done) {
            send = send || function() { node.send.apply(node,arguments) }; // pre 1.0 compat
            done = done || function (err) { if (err) { node.error(err, msg); } } // pre 1.0 compat

            // Really rough testing
            if (msg.payload.postType) {
                if (msg.payload.postType === 'plaintext' && msg.payload.blogIdentifier && msg.payload.text && msg.payload.tags) {
                    node.aioTumblrConfig.signedRequest(
                        'POST',
                        `blog/${msg.payload.blogIdentifier}/posts`,
                        null,
                        null,
                        {
                            content: [{type: 'text', text: msg.payload.text}],
                            tags: msg.payload.tags.join(',')
                        }
                    ).then(function (data) {
                        msg.payload = data.data.response;
                        send(msg);
                        done()
                    }).catch(function (err) {
                        done(err.stack);
                    });
                }
                else if (msg.payload.postType === 'photoPost' && msg.payload.blogIdentifier && msg.payload.content && msg.payload.layout) {
                    if (msg.payload.files) {
                        // Assume uploads are included and format based on the identifier/filename from `msg.payload.content`:
                        // assume format for `msg.payload.files` is object with key identifier and value `{file: <buffer>, filename: <string>}
                        const form = new FormData({'_boundary': 'TumblrBoundary'});
                        if (!msg.payload.tags) {
                            msg.payload.tags = []
                        }
                        form.append(
                            'json',
                            JSON.stringify({
                                content: msg.payload.content,
                                layout: msg.payload.layout,
                                tags: msg.payload.tags.join(','),
                            }),
                            {
                                contentType: 'application/json',
                            }
                        );
                        msg.payload.content.forEach(function(contentBlock) {
                            if (contentBlock.type === 'image' && contentBlock.media) {
                                contentBlock.media.forEach(function(mediaItem) {
                                    if (mediaItem.identifier) {
                                        let fileInfo = msg.payload.files[mediaItem.identifier];
                                        form.append(
                                            mediaItem.identifier,
                                            fileInfo.file,
                                            {
                                                filename: fileInfo.filename,
                                                contentType: mediaItem.type
                                            }
                                        );
                                    }
                                });
                            }
                        });
                        // Try posting this mess to tumblr...
                        this.aioTumblrConfig.signedRequest(
                            'POST',
                            `blog/${msg.payload.blogIdentifier}/posts`,
                            null,
                            null,
                            // fix this name to something like includeBodyInSigning
                            form.getBuffer(),
                            form.getHeaders(),
                        ).then(function (data) {
                            msg.payload = data.data.response;
                            send(msg);
                            done()
                        }).catch(function (err) {
                            done(err.stack);
                        });
                    }
                }
            }
            else {
                // Not implemented
                done();
            }
        });
    }

    RED.nodes.registerType('aiotumblr-out', AIOTumblrOutNode);

    // 3-legged-auth initialising
    RED.httpAdmin.get('/aiotumblr-credentials/:id/auth', async function(req, res) {
        // let configNode = RED.nodes.getNode(req.params.id);
        // if (configNode === null) {
        //     res.sendStatus(404);
        //     return;
        // }
        if (!req.query.consumer_key || !req.query.consumer_secret ||
            !req.query.callback) {
            res.sendStatus(400);
            return;
        }

        RED.log.debug('after query check');

        let credentials = {
            consumer_key: req.query.consumer_key,
            consumer_secret: req.query.consumer_secret,
        };
        RED.log.debug('setting credentials:');
        RED.log.debug(util.inspect(credentials));

        // store credentials from request in config node's in-memory credential storage
        RED.nodes.addCredentials(req.params.id, credentials);
        RED.log.debug('after storing credentials');

        let oauth = _getOAuthObject(credentials.consumer_key, credentials.consumer_secret);
        RED.log.debug('after getting oauth object');

        // 3-legged-auth
        // Step 1. Request the request token
        const reqTokenRequest = {
            url: _requestTokenURL,
            method: 'POST',
            data: {
                oauth_callback: req.query.callback,
            },
        };

        RED.log.debug(util.inspect(reqTokenRequest));
        try {
            const requestTokenResp = await axios.post(reqTokenRequest.url, {
                headers: oauth.toHeader(
                    oauth.authorize(reqTokenRequest)
                ),
            });
            RED.log.debug('after axios.post');
            const requestTokens = querystring.parse(requestTokenResp.data);

            // Store request tokens temporarily for step 3 to use them
            credentials.request_token = requestTokens.oauth_token;
            credentials.request_token_secret = requestTokens.oauth_token_secret;
            RED.nodes.addCredentials(req.params.id,credentials);

            // Step 2a: redirect to authorisation URL for the user to give permission to our application
            const authoriseURL = _authoriseBaseURL + requestTokens.oauth_token;
            res.redirect(authoriseURL);
        }
        catch (e) {
            // Promise rejection for `axios.post`; todo proper cleanup
            RED.log.error(e.stack);
            res.sendStatus(500);
        }
    });

    // 3-legged-auth callback
    RED.httpAdmin.get('/aiotumblr-credentials/:id/auth/callback', async function(req, res) {
        // let configNode = RED.nodes.getNode(req.params.id);
        // if (configNode === null) {
        //     res.sendStatus(404);
        //     return;
        // }

        // 3-legged-auth
        // Step 2b: parse the callback to get the verifier
        if (!req.query.oauth_verifier) {
            res.sendStatus(400);
            return;
        }

        // Get request tokens from the previous step to use again
        let credentials = RED.nodes.getCredentials(req.params.id);
        if (!credentials.request_token || !credentials.request_token_secret) {
            // Something went wrong and this request was called without finishing step 2a; abort
            // TODO: send proper error message
            RED.log.error('Failed to retrieve request tokens for step 3 of 3-legged-auth. This should not happen.');
            res.sendStatus(400);
            return;
        }
        // Use stored credentials from previous step to re-create the oauth object
        let oauth = _getOAuthObject(credentials.consumer_key, credentials.consumer_secret);

        // Step 3: Get access tokens
        const requestTokens = _tokensToOauthObject(credentials.request_token, credentials.request_token_secret);
        const accessTokenRequest = {
            url: _accessTokenURL,
            method: 'POST',
            data: {
                oauth_verifier: req.query.oauth_verifier,
            },
        };
        try {
            const accessTokenResp = await axios.post(accessTokenRequest.url, {
                headers: oauth.toHeader(oauth.authorize(accessTokenRequest, requestTokens))
            });
            const accessTokens = querystring.parse(accessTokenResp.data);

            credentials = {
                consumer_key: credentials.consumer_key,
                consumer_secret: credentials.consumer_secret,
                access_token: accessTokens.oauth_token,
                access_token_secret: accessTokens.oauth_token_secret
            };

            // Use new tokens to request the username:
            const userInfoResp = await _getUserInfo(oauth, accessTokens.oauth_token, accessTokens.oauth_token_secret);
            credentials.username = userInfoResp.user.name;

            RED.nodes.addCredentials(req.params.id, credentials);
            res.send("AIOTumblr is now authorised and ready to use!")
        }
        catch (e) {
            // Promise rejection for `axios.post` or `axios.get`; todo proper cleanup
            RED.log.error(e);
            res.sendStatus(500);
        }
    });

    RED.httpAdmin.get('/aiotumblr-credentials/default-defs.json', function(req, res) {
        const definitions = require('./definitions-default.js');
        res.json(definitions);
    });

    RED.httpAdmin.get('/aiotumblr-credentials/:id/docs/:format', function(req, res) {
        let configNode = RED.nodes.getNode(req.params.id);
        if (configNode === null) {
            res.status(404).send('Config node not found; make sure you deploy for this to work.');
            return;
        }
        // TODO
    });
}
