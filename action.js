const HerokuConfigurerHandler = ()=>{
    error_handler.innerHTML = "Importing...";
    error_handler.style.color = "yellow";
    if(app_name.value.length < 1){
        error_handler.innerHTML = "Please type the app name";
        error_handler.style.color = "red";
    }else{
        if(file.files.length < 1){
            error_handler.innerHTML = "Please select a valid file of extension .env, .json or .txt";
            error_handler.style.color = "red";
        }else{
            let splitted_name = (file.files[0].name).split(".");
            let ext = splitted_name[splitted_name.length - 1].toLowerCase();
            if(!['env', 'txt', 'json'].includes(ext)){
                error_handler.innerHTML = "Please select a valid file of extension .env, .json or .txt";
                error_handler.style.color = "red";
            }else{
                return continueUpload(app_name.value, file.files[0], ext);
            }
        }
    }
}
const IdSelector = (id)=>{
    return document.getElementById(id);
}

continueUpload = (name, file, ext)=>{
    let reader = new FileReader();
    reader.readAsText(file);
    return reader.onload = ()=>{
        const configText = reader.result;
        let configPayload = {};
        let alertString = `Please confirim that you want to import the following configurations for your app.\n\n`;
        switch (ext) {
            case 'json':
                try{
                    let parsedPayload = JSON.parse(configText);
                    let keys = Object.keys(parsedPayload);
                    for(let i = 0; i < keys.length; i++){
                        let currentValue = parsedPayload[keys[i]];
                        if(typeof(currentValue) != "string"){
                            error_handler.innerHTML = "Only string values are allowed";
                            error_handler.style.color = "red";
                            return;
                        }else{
                            configPayload[`${keys[i].trim()}`] = currentValue.trim();
                            let currentString = `${keys[i].trim()} : ${currentValue.trim()}`;
                            alertString += `${currentString}\n`;
                        }
                    }
                    break;
                }catch(error){
                    error_handler.innerHTML = "Invalid JSON file, please check the file uploaded";
                    error_handler.style.color = "red";
                    return;
                }
            default:
                let splittedPayload = configText.split("\n");
                for(let i = 0; i < splittedPayload.length; i++){
                    let eachPayload = splittedPayload[i];
                    eachPayload = eachPayload.replace("\r", "");
                    if(eachPayload != "" && eachPayload != ""){
                        if(eachPayload.includes("=") != true){
                            error_handler.innerHTML = `Invalid character - "${eachPayload}", no "=" provided.`;
                            error_handler.style.color = "red";
                            return;
                        }else{
                            let eachSplitted = eachPayload.split("=");
                            configPayload[`${eachSplitted[0].trim()}`] = eachSplitted[1].trim();
                            let currentString = `${eachSplitted[0].trim()} : ${eachSplitted[0].trim()}`;
                            alertString += `${currentString}\n`;
                        }
                    }
                }
                break;
        }
        const confirmation = confirm(alertString);
        if(confirmation == true){
            chrome.tabs.query({url : "https://dashboard.heroku.com/*"}, (tabs)=>{
                if(tabs.length < 1){
                    error_handler.innerHTML = `You are not logged in to heroku in any tab.`;
                    error_handler.style.color = "red";
                }else{
                    var herokuTab = tabs[0];
                    chrome.tabs.sendMessage(herokuTab.id, {name, action : "import-app-config", config : configPayload});    
                }
            });
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse)=>{
    if(message.msg != undefined){
        error_handler.innerHTML = `${message.msg}`;
    }
    if(message.new_percent != undefined){
        main_progress.style.width = `${message.new_percent}%`;
        if(message.new_percent == 100){
            main_progress.style.background = "green";
        }
    }
    if(message.status == 0){
        error_handler.style.color = "red";
        main_progress.style.background = "red";
    }
    if(message.status == 1){
        error_handler.style.color = "green";
        setTimeout(() => {
            app_name.value = "";
            file.value = "";
        }, 1000);
    }
    if(message.status == 2){
        error_handler.style.color = "yellow";
    }
    if(message.type == "loaded-apps"){
        app_name.innerHTML = "<option value=''>Select App</option>"
        message.apps.forEach((each)=>{
            app_name.innerHTML += `<option value='${each.id}'>${each.name}</option>`;
        });
    }
});
chrome.tabs.query({url : "https://dashboard.heroku.com/*"}, (tabs)=>{
    if(tabs.length < 1){
        error_handler.innerHTML = `You are not logged in to heroku in any tab.`;
        error_handler.style.color = "red";
    }else{
        var herokuTab = tabs[0];
        chrome.tabs.sendMessage(herokuTab.id, {action : "load-apps"});    
    }
});

const error_handler = IdSelector("heroku-configurer-error-msg");
const app_name = IdSelector("app-name");
const file = IdSelector("heroku-configurer-file");
const selector = IdSelector("select-file");
const file_name = IdSelector("file-name");
const file_size = IdSelector("file-size");
const progress = IdSelector("uploading-section");
const btn = IdSelector("heroku-configurer-btn");
const close_btn = IdSelector("close-extension");
const main_progress = IdSelector("main-brainstorm");

btn.addEventListener("click", (e)=>{ e.preventDefault(); HerokuConfigurerHandler(); });
close_btn.addEventListener("click", (e)=>{window.close();})
selector.addEventListener("click", ()=>{file.click();})
file.addEventListener("change", ()=>{
    error_handler.innerHTML = ``;
    let test_ext = file.files[0].name.split(".")[file.files[0].name.split(".").length - 1].toLowerCase();
    if(['txt', 'json', 'env'].includes(test_ext) != true){
        error_handler.innerHTML = `Invalid file selected`;
        error_handler.style.color = "red";
        file.value = ""
    }else{
        progress.style.display = "block";
        file_name.innerHTML = file.files[0].name;
        let size = file.files[0].size;
        if(size >= 1000000){
            file_size.innerHTML = `${Math.ceil(size / 1000000)}Mb(s)`;
        }else{
            if(size >= 1000){
                file_size.innerHTML = `${Math.ceil(size / 1000)}Kb(s)`;
            }else{
                file_size.innerHTML = `${size}bytes`;
            }
        }
    }
})

