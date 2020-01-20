const requestFilter = {
    urls: ['<all_urls>'],
    types: ['main_frame', 'sub_frame']
};

function getOptions() {
    return browser.storage.local.get({
        redirectDelay: 5000
    });
}

function wait(duration) {
    return new Promise(function(resolve, _) {
        setTimeout(function() {
            resolve(duration);
        }, duration);
    });
}

function lastRequestKey(tabId, frameId) {
    return `${tabId}:${frameId}`;
}

let blocks = new Map();
let tabLastRequestUrl = new Map();

browser.notifications.onClicked.addListener(notificationId => {
    blocks.set(notificationId, true);
    browser.notifications.update(notificationId, {
        type: 'basic',
        title: 'Verbose Redirect',
        message: 'Redirect will be blocked...'
    });
});

browser.webRequest.onHeadersReceived.addListener(
    details => {
        tabLastRequestUrl.set(lastRequestKey(details.tabId, details.frameId), details.url);
    },
    requestFilter,
    []
);

browser.tabs.onRemoved.addListener(tabId => {
    // Clean up to prevent the map from growing over time
    let keysToRemove = tabLastRequestUrl.keys().filter(k => k.startsWith(`${tabId}:`));
    for (keys of keysToRemove) {
        tabLastRequestUrl.delete(key);
    }
});

browser.webRequest.onBeforeRequest.addListener(
    async function(details) {
        // Always allow first request
        if (!tabLastRequestUrl.has(lastRequestKey(details.tabId, details.frameId))) {
            return;
        }

        let originUrl = new URL(tabLastRequestUrl.get(lastRequestKey(details.tabId, details.frameId)));
        let url = new URL(details.url);

        // Allow redirects within host
        if (originUrl.host === url.host) {
            return;
        }

        browser.notifications.create(details.requestId, {
            type: 'basic',
            title: 'Verbose Redirect',
            message: `${originUrl.host} -> ${url}`
        });

        let opts = await getOptions();
        await wait(opts.redirectDelay);

        browser.notifications.clear(details.requestId);
        if (blocks.has(details.requestId)) {
            blocks.delete(details.requestId);
            return {
                cancel: true
            };
        }
        return;
    },
    requestFilter,
    ['blocking']
);
