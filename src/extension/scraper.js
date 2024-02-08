const scraped = new Set();
const reacted = new Set();
const reposted = new Set();
const commented = new Set();
const shared = new Set();

let username = undefined;

const socialActions = {
    SCRAPE: 'SCRAPE',
    REACT: 'REACT',
    COMMENT: 'COMMENT',
    REPOST: 'REPOST',
    SHARE: 'SHARE'
};

const findParentPost = async (el) => {
    while ((el = el.parentElement) && !el.classList.contains("relative"));
    return el;
}

const handleSocialEvents = async (btn, port) => {
    return async function () {

        const classes = Array.from(btn.classList);
        const post = await findParentPost(btn);
        const postId = post.getAttribute('data-urn');

        if (classes.includes("react-button__trigger") && !reacted.has(postId)) {
            reacted.add(postId);
            const postDetails = await extractPostDetails(post, socialActions.REACT);
            await port.postMessage({ event: socialActions.REACT, username: username, post: postDetails });
        }
        else if (classes.includes("comment-button") && !commented.has(postId)) {
            commented.add(postId);
            const postDetails = await extractPostDetails(post, socialActions.COMMENT);
            await port.postMessage({ event: socialActions.COMMENT, username: username, post: postDetails });
        }
        else if (classes.includes("social-reshare-button") && !reposted.has(postId)) {
            reposted.add(postId);
            const postDetails = await extractPostDetails(post, socialActions.REPOST);
            await port.postMessage({ event: socialActions.REPOST, username: username, post: postDetails });
        }
        else if (classes.includes("send-privately-button") && !shared.has(postId)) {
            shared.add(postId);
            const postDetails = await extractPostDetails(post, socialActions.SHARE);
            await port.postMessage({ event: socialActions.SHARE, username: username, post: postDetails });
        }
    }
};

const listenForSocialEvents = async (port) => {
    const socialButtons = Array.from(document.querySelectorAll(".social-actions-button"));
    socialButtons.forEach(async (button) => {
        button.addEventListener("click", await handleSocialEvents(button, port), false);
    });
};

const extractPostDetails = async (post, eventType) => {

    const postId = post.getAttribute('data-urn');
    const authorInfo = post.getElementsByClassName("app-aware-link  update-components-actor__container-link relative display-flex flex-grow-1")[0];
    const authorImageInfo = authorInfo.querySelector("img.EntityPhoto-square-1, img.EntityPhoto-circle-1, img.EntityPhoto-circle-3, img.EntityPhoto-square-3")
    const textInfo = post.querySelector("span[class='break-words']").querySelector("span[dir=ltr]");
    const social = post.querySelector("ul.social-details-social-counts");
    const metrics = {
        nReactions: 0,
        nComments: 0,
        nReposts: 0
    };

    if (social) {
        let nReactions = social.querySelector("li.social-details-social-counts__reactions");
        let nComments = social.querySelector("li.social-details-social-counts__comments");

        metrics.nReposts = social.querySelectorAll("li").length >= 3 ? social.querySelectorAll("li")[2]
            .querySelector("span").innerText.trim().replace("reposts", "").replace("repost", "").replace(",", "").trim() : 0;
        metrics.nReposts = parseInt(metrics.nReposts, 10);

        metrics.nReactions = nReactions ?
            nReactions.querySelector("span.social-details-social-counts__social-proof-fallback-number,  span.social-details-social-counts__reactions-count")
                .innerText.replace(",", "") : 0;
        metrics.nReactions = parseInt(metrics.nReactions, 10);

        metrics.nComments = nComments ? nComments.querySelector("span").innerText.trim()
            .replace("comments", "").replace("comment", "").replace(",", "").trim() : 0;
        metrics.nComments = parseInt(metrics.nComments, 10);
    }

    return {
        id: postId,
        authorUrl: authorInfo['href'],
        authorImage: authorImageInfo['src'],
        author: authorImageInfo['alt'],
        text: textInfo['textContent'],
        metrics: metrics,
        eventType: eventType,
        timestamp: Date.now(),
        currentUser: username,
        source: 'linkedin'
    }
};

const scrapeUserProfile = async (port) => {
    try {
        // const profile = document.getElementsByClassName("ember-view block")[0];
        if (!username) {
            username = document.querySelector("a.ember-view.block").getAttribute('href').replace("/in", "").replace(/\//g, '');
        }
        // username = profile.attributes['href'].textContent.replace("/in", "").replace(/\//g, '');

        const feed = Array.from(document.getElementsByClassName("feed-shared-update-v2 feed-shared-update-v2--minimal-padding full-height relative artdeco-card"));
        let posts = [];

        for (const post of feed) {
            try {
                const postId = post.getAttribute('data-urn');
                if (!scraped.has(postId)) {
                    scraped.add(postId);
                    const postDetails = await extractPostDetails(post, socialActions.SCRAPE);
                    posts.push(postDetails);
                }
            }
            catch (error) { }
        }

        posts = posts.filter((post) => post !== null && post !== undefined);
        if (posts) {
            await port.postMessage({ event: socialActions.SCRAPE, username: username, posts: posts });
        }

    } catch (error) { console.log(error); }
};

chrome.runtime.onConnect.addListener(async (port) => {
    if (!port.name === "profile-scraper") return;

    port.onMessage.addListener(async (message) => {
        if (message.text == "scrape-profile") {

            await new Promise(resolve => setTimeout(resolve, 2000));

            const observer = new MutationObserver(async () => {
                await listenForSocialEvents(port);
                await scrapeUserProfile(port);
            });
            observer.observe(document, { subtree: true, childList: true });
        }
    });
});