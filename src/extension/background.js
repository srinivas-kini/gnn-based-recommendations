const tabData = {};
const feed = [];
const socialActions = {
    SCRAPE: 'SCRAPE',
    REACT: 'REACT',
    COMMENT: 'COMMENT',
    REPOST: 'REPOST',
    SHARE: 'SHARE'
};

const scrapeProfile = async (tab) => {
    if (tab.url.includes("www.linkedin.com/feed/")) {
        var port = await chrome.tabs.connect(tab.id, { name: "profile-scraper" });
        tabData[tab.id] = tab;
        port.postMessage({ text: "scrape-profile" });
        port.onMessage.addListener(async (newPosts) => {

            if (!newPosts.hasOwnProperty('event')) return;

            switch (newPosts.event) {
                case socialActions.SCRAPE:
                    if (newPosts.hasOwnProperty('username') && newPosts.hasOwnProperty('posts')
                        && newPosts.posts.length > 0 && newPosts.username) {
                        console.log('Scraped posts');
                        console.log(newPosts); //-- Get the data here
                        feed.push(newPosts);
                    }
                case socialActions.REACT:
                case socialActions.COMMENT:
                case socialActions.REPOST:
                case socialActions.SHARE:
                    if (newPosts.hasOwnProperty('username') && newPosts.hasOwnProperty('post')
                        && newPosts.post && newPosts.username) {
                        console.log('Captured an event');
                        console.log(newPosts); //-- Get the data here
                        feed.push(newPosts);
                    }

            }
        })
    }
};

chrome.tabs.onUpdated.addListener(
    async (tabId, changeInfo, tab) => {
        await scrapeProfile(tab);
    }
);

chrome.tabs.onCreated.addListener(
    async (tab) => {
        await scrapeProfile(tab);
    }
);

chrome.tabs.onRemoved.addListener(
    async (tabId, removeInfo) => {
        if (tabId in tabData) {
            console.log('Closed tab: ', tabData[tabId].url);
            console.log('Showing all fetched posts...')

            let userData = JSON.stringify(feed);
            const response = await fetch("<LAMBDA_FUNCTION_URL>", {
                method: 'PUT',
                body: userData,
                headers: {
                    'Access-Control-Allow-Origin': '*'
                }
            });
            console.log(await response.json());
        }
    }
)
