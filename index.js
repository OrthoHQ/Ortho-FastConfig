console.log("Content script running....");
chrome.runtime.onMessage.addListener((message, sender, response) => {
    if (message.action == "import-app-config") {
        const config = message.config;
        const configKeys = Object.keys(config);
        const app_name = message.name;
        const accessToken = JSON.parse(localStorage['ember_simple_auth-session']).authenticated.access_token;
        if (!accessToken) {
            chrome.runtime.sendMessage({ status: 0, msg: "You're not logged in to heroku" });
        } else {
            const app_id = app_name;
            for (let i = 0; i < configKeys.length; i++) {
                let currentKey = configKeys[i];
                let currentValue = config[`${currentKey}`];
                let currentPayload = {}
                currentPayload[`${currentKey}`] = currentValue;
                chrome.runtime.sendMessage({ status: 2, msg: `Importing ${currentKey}...` });
                let payload2 = {
                    method: "PATCH",
                    headers: {
                        authorization: `Bearer ${accessToken}`,
                        accept: 'application/vnd.heroku+json; version=3.cedar-acm',
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(currentPayload)
                }
                setTimeout(async () => {
                    return await fetch(`https://api.heroku.com/apps/${app_id}/config-vars`, payload2).then((res) => {
                        if (res.status != 200) {
                            chrome.runtime.sendMessage({ status: 0, msg: `Failed to import ${currentKey}` });
                            i -= i;
                        } else {
                            let new_percent= parseFloat(parseFloat(i + 1) / configKeys.length) * 100
                            chrome.runtime.sendMessage({ status: 2, msg: `${currentKey} imported`, new_percent });

                            if (i == configKeys.length - 1) {
                                chrome.runtime.sendMessage({ status: 1, msg: `Importation completed, refreshing page.` });
                                setTimeout(() => {
                                    window.location = `https://dashboard.heroku.com/apps/${app_name}/settings`;
                                }, 1000);
                            }
                        }
                    }).catch(err => {
                        console.log(err);
                        chrome.runtime.sendMessage({ status: 0, msg: `Failed to import ${currentKey}` });
                        i -= i;
                    })
                }, 10000);
            }         
        }

    }
    if (message.action == "load-apps") {
        const accessToken = JSON.parse(localStorage['ember_simple_auth-session']).authenticated.access_token;
        if (!accessToken) {
            chrome.runtime.sendMessage({ status: 0, msg: "You're not logged in to heroku" });
        } else {
            const payload = {
                method: "GET",
                headers: {
                    authorization: `Bearer ${accessToken}`,
                    accept: 'application/vnd.heroku+json; version=3.cedar-acm'
                }
            }
            fetch(`https://api.heroku.com/users/~/apps`, payload).then((res) => {
                res.json().then((json) => {
                    if (json.length < 1) {
                        chrome.runtime.sendMessage({ status: 0, msg: "Unable to retrieve apps" });
                    } else {
                        chrome.runtime.sendMessage({ type: 'loaded-apps', apps: json });
                    }
                }).catch(err => {
                    chrome.runtime.sendMessage({ status: 0, msg: "Unable to retrieve apps" });
                })
            }).catch(err => {
                chrome.runtime.sendMessage({ status: 0, msg: "Unable to retrieve apps" });
            })
        }

    }
});