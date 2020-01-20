function getOptions() {
    return browser.storage.local.get({
        redirectDelay: 5000
    });
}

let delay = document.getElementById('delay');

document.addEventListener('DOMContentLoaded', async function() {
    let opts = await getOptions();
    delay.value = opts.redirectDelay;
});

delay.addEventListener('change', () => {
    browser.storage.local.set({
        redirectDelay: parseInt(delay.value)
    });
});
