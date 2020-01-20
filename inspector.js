const requestFilter = {
    urls: ['<all_urls>'],
    types: ['main_frame', 'script', 'sub_frame']
};

function getOptions() {
    return browser.storage.local.get({
        redirectDelay: 5000
    });
}

function wait(duration) {
    return new Promise(resolve => {
        setTimeout(() => resolve, duration);
    });
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
        tabLastRequestUrl.set(details.tabId, details.url);
    },
    requestFilter,
    []
);

browser.tabs.onRemoved.addListener(tabId => {
    tabLastRequestUrl.delete(tabId);
});

browser.webRequest.onBeforeRequest.addListener(
    async function(details) {
        // Always allow first request
        if (!tabLastRequestUrl.has(details.tabId)) {
            return;
        }

        let originUrl = new URL(tabLastRequestUrl.get(details.tabId));
        let url = new URL(details.url);

        // Allow redirects within host
        if (originUrl.host === url.host) {
            return;
        }

        browser.notifications.create(details.requestId, {
            type: 'basic',
            title: 'Verbose Redirect',
            message: `${originUrl.host} -> ${url}\nClick here to block`
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
