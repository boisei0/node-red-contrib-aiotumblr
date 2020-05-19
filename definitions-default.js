const definition_base = {
    'method_name': '', // 'get_blog_info'
    'doc': {
        'title': '', // 'Retrieve blog info'
        'description': '', // 'This method returns general information about the blog, such as the title, number of posts, and other high-level data.',
        'notes': [ // (Optional)
            {
                'alert_level': '', // (Any of 'info', 'warning', 'error')
                'text': '', // Full text
            }
        ],
    },
    'display': {
        'group': '' // 'blog'
    },
    'http': {
        'method': '', // 'GET'
        'endpoint': '', // 'blog/{blog_identifier}/info',
        'url_params': { // (values to be replaced in the endpoint url)
            '<name>': { // 'blog_identifier'
                'msg_prop': '', // (where is it defined on the msg object: ) 'payload.blog_identifier'
                'doc': '', // (description how to explain it in the docs: ) 'The blog whose the info is requested' [sic]
                // Validator?
            },
            // ...
        },
        'search_params': { // (Optional, key-value pairs to be added to the query part of the url)
            '<name>': { // (key) 'limit'
                'required': false, // (boolean, will the request fail if not specified?)
                'doc': '', // (description how to explain it in the docs: ) 'The number of results to return: 1–20, inclusive'
                'default': '', // (default to use/used by the API internally if not specified, type: any) 20
                // validator?
                'msg_prop': '', // (where is it defined on the msg object: ) 'payload.limit'
            },
            // ...
        },
        'body': {
            'has_body': false, // (boolean, required)
            'allows_upload': false, // (boolean, required if has_body=true; if true `msg.payload.files` has to hold an array of prepared media objects to upload)
            'type': '', // (Optional, options: 'form-urlencoded', 'json', 'multipart') 'form-urlencoded'
            'sign_body': false, // (boolean, required if has_body=true and type=multipart, whether or not the body has to be included in the oauth signature. By default, form-urlencoded is required in signature, json isn't, multipart is likely json, but for future proof)
            'content_type': '', // (Optional, ignored unless type='multipart' to set the content type of the first part of a multipart body; hide from display unless type=multipart set) 'application/json'
            'data': {
                '<name>': { // (key) 'content'
                    'required': true, // (boolean, will the request fail if not specified?)
                    'doc': '', // (description how to explain it in the docs: ) 'An array of NPF content blocks to be used to make the post.'
                    'default': '', // (default, only present when required=false, type: any)
                    // validator?
                    'msg_prop': '' // (where is it defined on the msg object: ) 'payload.content'
                },
                // ...
            },
        }
    }
};

module.exports = {
    groups: [
        {
            'name': 'user',
            'name_readable': 'User',
            'doc': '',
        },
        {
            'name': 'blog',
            'name_readable': 'Blog',
            'doc': '',
        },
    ],
    definitions: [
        {
            'method_name': 'get_blog_info',
            'doc': {
                'title': 'Retrieve blog info',
                'description': 'This method returns general information about the blog, such as the title, number of posts, and other high-level data.',
            },
            'display': {
                'group': 'blog',
            },
            'http': {
                'method': 'GET',
                'endpoint': 'blog/{blog_identifier}/info',
                'url_params': {
                    'blog_identifier': {
                        'msg_prop': 'payload.blog_identifier',
                        'doc': 'The blog whose info is requested',
                    },
                },
                'body': {
                    'has_body': false,
                },
            },
        },
        // {
        //     'method_name': 'get_blog_avatar',
        //     'doc': {
        //         'title': 'Retrieve a Blog Avatar',
        //         'description': 'Retrieve a Blog Avatar as 64x64 pixel image',
        //     },
        //     'display': {
        //         'group': 'blog',
        //     },
        //     'http': {
        //         'method': 'GET',
        //         'endpoint': 'blog/{blog_identifier}/avatar',
        //         'url_params': {
        //             'blog_identifier': {
        //                 'msg_prop': 'payload.blog_identifier',
        //                 'doc': 'The blog whose avatar is requested',
        //             },
        //         },
        //         'body': {
        //             'has_body': false,
        //         },
        //     },
        // },
        {
            'method_name': 'get_blog_avatar_with_size',
            'doc': {
                'title': 'Retrieve a Blog Avatar with a specific size',
                'description': '',
            },
            'display': {
                'group': 'blog',
            },
            'http': {
                'method': 'GET',
                'endpoint': 'blog/{blog_identifier}/avatar/{size}',
                'url_params': {
                    'blog_identifier': {
                        'msg_prop': 'payload.blog_identifier',
                        'doc': 'The blog whose avatar is requested',
                    },
                    'size': {
                        'msg_prop': 'payload.size',
                        'doc': 'The size of the avatar',
                        // Validator: lambda x: x in [16, 24, 30, 40, 48, 64, 96, 128, 512]
                    },
                },
                'body': {
                    'has_body': false,
                },
            },
        },
        {
            'method_name': 'get_blog_likes',
            'doc': {
                'title': "Retrieve Blog's Likes",
                'description': 'Retrieve publicly exposed likes from a blog.',
                'notes': [
                    {
                        'type': 'warning',
                        'text': "Only one of the optional parameters `offset`, `before` or `after` can be used."
                    },
                    {
                        'type': 'warning',
                        'text': 'When requesting posts with an offset above 1000, switch to `before` or `after`.'
                    }
                ]
            },
            'display': {
                'group': 'blog',
            },
            'http': {
                'method': 'GET',
                'endpoint': 'blog/{blog_identifier}/likes',
                'url_params': {
                    'blog_identifier': {
                        'msg_prop': 'payload.blog_identifier',
                        'doc': 'The blog whose likes are requested',
                    },
                },
                'search_params': {
                    'limit': {
                        'required': false,
                        'doc': 'The number of results to return: 1–20, inclusive',
                        'default': 20,
                        'msg_prop': 'payload.limit',
                    },
                    'offset': {
                        'required': false,
                        'doc': 'Liked post number to start at (at most 1000)', // is this most-recent first or oldest first? I have no clue at all
                        'default': 0,
                        'msg_prop': 'payload.offset',
                    },
                    'before': {
                        'required': false,
                        'doc': 'Retrieve posts liked before the specified timestamp, in seconds since epoch',
                        'default': null,
                        'msg_prop': 'payload.before'
                    },
                    'after': {
                        'required': false,
                        'doc': 'Retrieve posts liked after the specified timestamp, in seconds since epoch',
                        'default': null,
                        'msg_prop': 'payload.after'
                    },
                },
                'body': {
                    'has_body': false
                },
            },
        },
        {
            'method_name': 'get_blog_following',
            'doc': {
                'title': "Retrieve Blog's following",
                'description': 'This method can be used to retrieve the publicly exposed list of blogs that a blog follows, in order from most recently-followed to first.',
            },
            'display': {
                'group': 'blog',
            },
            'http': {
                'method': 'GET',
                'endpoint': 'blog/{blog_identifier}/following',
                'url_params': {
                    'blog_identifier': {
                        'msg_prop': 'payload.blog_identifier',
                        'doc': 'The blog whose following is requested',
                    },
                },
                'search_params': {
                    'limit': {
                        'required': false,
                        'doc': 'The number of results to return: 1–20, inclusive',
                        'default': 20,
                        'msg_prop': 'payload.limit',
                    },
                    'offset': {
                        'required': false,
                        'doc': 'Followed blog index to start at',
                        'default': 0,
                        'msg_prop': 'payload.offset',
                    },
                },
                'body': {
                    'has_body': false
                },
            },
        },
        {
            'method_name': 'get_blog_followers',
            'doc': {
                'title': "Retrieve a Blog's Followers",
                'description': '',
            },
            'display': {
                'group': 'blog',
            },
            'http': {
                'method': 'GET',
                'endpoint': 'blog/{blog_identifier}/followers',
                'url_params': {
                    'blog_identifier': {
                        'msg_prop': 'payload.blog_identifier',
                        'doc': 'The blog whose followers are requested',
                    },
                },
                'search_params': {
                    'limit': {
                        'required': false,
                        'doc': 'The number of results to return: 1–20, inclusive',
                        'default': 20,
                        'msg_prop': 'payload.limit',
                    },
                    'offset': {
                        'required': false,
                        'doc': 'Result to start at',
                        'default': 0,
                        'msg_prop': 'payload.offset',
                    },
                },
                'body': {
                    'has_body': false,
                }
            },
        },
        {
            'method_name': 'get_blog_posts',
            'doc': {
                'title': 'Retrieve Published Posts',
                'description': '',
            },
            'display': {
                'group': 'blog',
            },
            'http': {
                'method': 'GET',
                'endpoint': 'blog/{blog_identifier}/posts',
                'url_params': {
                    'blog_identifier': {
                        'msg_prop': 'payload.blog_identifier',
                        'doc': 'The blog whose posts are requested',
                    },
                },
                'search_params': {
                    'id': {
                        'required': false,
                        'doc': 'A specific post ID. Returns the single post specified or (if not found) a 404 error.',
                        'default': null,
                        'msg_prop': 'payload.id',
                    },
                    'tag': {
                        'required': false,
                        'doc': 'Limits the response to posts with the specified tag',
                        'default': null,
                        'msg_prop': 'payload.tag',
                    },
                    'limit': {
                        'required': false,
                        'doc': 'The number of posts to return: 1–20, inclusive',
                        'default': 20,
                        'msg_prop': 'payload.limit',
                    },
                    'offset': {
                        'required': false,
                        'doc': 'Post number to start at',
                        'default': 0,
                        'msg_prop': 'payload.offset',
                        // Validator? Max offset of 1000? No clue at all, because it's not documented...
                    },
                    'reblog_info': {
                        'required': false,
                        'doc': 'Indicates whether to return reblog information. Returns the various `reblogged_` fields.',
                        'default': false,
                        'msg_prop': 'payload.reblog_info',
                    },
                    'notes_info': {
                        'required': false,
                        'doc': 'Indicates whether to return notes information (specify true or false). Returns note count and note metadata.',
                        'default': false,
                        'msg_prop': 'payload.notes_info',
                    },
                    'filter': {
                        'required': false,
                        'doc': 'Specifies the post format to return, other than HTML: `text` – Plain text, no HTML; `raw` – As entered by the user (no post-processing); if the user writes in Markdown, the Markdown will be returned rather than HTML.',
                        'default': null,
                        'msg_prop': 'payload.filter',
                    },
                    'before': {
                        'required': false,
                        'doc': 'Returns posts published earlier than a specified Unix timestamp, in seconds.',
                        'default': null,
                        'msg_prop': 'payload.before'
                    },
                },
                'body': {
                    'has_body': false,
                },
            },
        },
        {
            'method_name': 'get_blog_posts_with_type',
            'doc': {
                'title': 'Retrieve Published Posts',
                'description': 'Retrieve Published Posts of a specific type',
            },
            'display': {
                'group': 'blog',
            },
            'http': {
                'method': 'GET',
                'endpoint': 'blog/{blog_identifier}/posts/{type}',
                'url_params': {
                    'blog_identifier': {
                        'msg_prop': 'payload.blog_identifier',
                        'doc': 'The blog whose posts are requested',
                    },
                    'type': {
                        'msg_prop': 'payload.type',
                        'doc': 'Type of the post',
                        // 'validator': lambda x: x in POST_TYPES,
                        // POST_TYPES = [
                        //     'text',
                        //     'quote',
                        //     'link',
                        //     'answer',
                        //     'video',
                        //     'audio',
                        //     'photo',
                        //     'chat'
                        // ]
                    }
                },
                'search_params': {
                    'id': {
                        'required': false,
                        'doc': 'A specific post ID. Returns the single post specified or (if not found) a 404 error.',
                        'default': null,
                        'msg_prop': 'payload.id',
                    },
                    'tag': {
                        'required': false,
                        'doc': 'Limits the response to posts with the specified tag',
                        'default': null,
                        'msg_prop': 'payload.tag',
                    },
                    'limit': {
                        'required': false,
                        'doc': 'The number of posts to return: 1–20, inclusive',
                        'default': 20,
                        'msg_prop': 'payload.limit',
                    },
                    'offset': {
                        'required': false,
                        'doc': 'Post number to start at',
                        'default': 0,
                        'msg_prop': 'payload.offset',
                        // Validator? Max offset of 1000? No clue at all, because it's not documented...
                    },
                    'reblog_info': {
                        'required': false,
                        'doc': 'Indicates whether to return reblog information. Returns the various `reblogged_` fields.',
                        'default': false,
                        'msg_prop': 'payload.reblog_info',
                    },
                    'notes_info': {
                        'required': false,
                        'doc': 'Indicates whether to return notes information (specify true or false). Returns note count and note metadata.',
                        'default': false,
                        'msg_prop': 'payload.notes_info',
                    },
                    'filter': {
                        'required': false,
                        'doc': 'Specifies the post format to return, other than HTML: `text` – Plain text, no HTML; `raw` – As entered by the user (no post-processing); if the user writes in Markdown, the Markdown will be returned rather than HTML.',
                        'default': null,
                        'msg_prop': 'payload.filter',
                    },
                    'before': {
                        'required': false,
                        'doc': 'Returns posts published earlier than a specified Unix timestamp, in seconds.',
                        'default': null,
                        'msg_prop': 'payload.before'
                    },
                },
                'body': {
                    'has_body': false,
                },
            },
        },
        {
            // TODO CONTINUE HERE
        }
    ],
};
