importScripts('/digital/pwa/cache-polyfill.js');

var CACHE_NAME = 'v1::sharepass';

// Install
self.addEventListener('install', function (event) {
    console.log('install fired');
    var urlsToCache = [
        '/digital/pwa/confirmation',
        '/assets/digital-licence/share-pass.css',
        '/assets/digital-licence/images/govuk-crest.svg',
        '/digital/pwa/cache-polyfill.js'
    ];

        caches.open(CACHE_NAME).then(function (cache) {
            console.log('Caching ' + urlsToCache);

            urlsToCache.forEach(function(url) {

                var request = new Request(url, {credentials: 'include', redirect: 'follow'});

                fetch(request).then(function(response) {

                    if(response.redirected)
                    {
                        console.log('Do not cache url with redirect: ' + url);
                    } else
                    {
                        console.log('Caching: ' + url);
                        cache.put(url, response);

                    }

                })
            });

        })

});

self.addEventListener('activate', function (event) {
    console.log('activate fired');
    clients.claim();
    console.log('Now ready to handle fetches!');
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName) {
                    return cacheName !== CACHE_NAME;
                }).map(function (cacheName) {
                    console.log('Deleting ' + cacheName);
                    return caches.delete(cacheName);
                })
            );
        })
    );
});


self.addEventListener('fetch', function (event) {
    console.log('fetch fired');
    var requestedUrl = event.request.url;
    event.respondWith(
        caches.match(event.request)
            .then(function (response) {
                if (response) {
                    console.log('Cache for : ' + requestedUrl);
                    return response;
                }

                var urlBlackList = [
                    'manifest.json',
                    'sw.js'
                ];
                var isInUrlBlackList = false
                urlBlackList.forEach(function (url) {
                    if (url.indexOf((requestedUrl.substr(requestedUrl.lastIndexOf('/') + 1))) > -1) return isInUrlBlackList = true;
                })

                if (!isInUrlBlackList) {
                    //not in blacklist so go ahead and cache
                    console.log('New fetch request for not cached : ' + requestedUrl + ' not in blacklist so cache');
                    // Clone the request. A request is a stream and can only be consumed once.
                    // Since we are consuming this once by cache and once by the browser for fetch, we need to clone the response.
                    var fetchRequest = event.request.clone();
                    return fetch(fetchRequest).then(
                        function (response) {
                            // Check if we received a valid response
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }
                            // Clone the response. A response is a stream and because we want the browser to consume the response
                            // as well as the cache consuming the response, we need to clone it so we have two streams.
                            var responseToCache = response.clone();

                            caches.open(CACHE_NAME)
                                .then(function (cache) {
                                    cache.put(event.request, responseToCache);
                                });
                            return response;
                        }
                    );
                } else {
                    console.log('New fetch request for not cached : ' + requestedUrl + ' in blacklist so do not cache');
                    //in blacklist so return response without adding to cache
                    return fetch(event.request, {credentials: 'include', redirect: 'follow'});
                }
            })
    );
});