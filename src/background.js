// Define a Promise that resolves to the tabsCreateUrl value
const tabsCreateUrlPromise = chrome.storage.sync.get({
  tabsCreateUrl: chrome.i18n.getMessage("tabsCreateUrl"),
});

async function getSelectedText() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;
      if (tabs[0].status === "complete") {
        // If the tab is already loaded, send the message immediately
        sendMessage(tabId);
      } else {
        // If the tab is not loaded, wait for it to load before sending the message
        chrome.tabs.onUpdated.addListener(function listener(tabIdUpdated, info) {
          if (tabIdUpdated === tabId && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            sendMessage(tabId);
          }
        });
      }
    });

    function sendMessage(tabId) {
      chrome.tabs.sendMessage(tabId, { message: "getSelectedText" }, function (response) {
        if (response && response.selectedText) {
          resolve(response.selectedText);
        } else {
          reject("No text selected");
        }
      });
    }
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  try {
    const { tabsCreateUrl } = await tabsCreateUrlPromise;
    const search = encodeURIComponent(await getSelectedText());
    if (command === "backgroundSearch") {
      chrome.tabs.create({
        active: false,
        url: tabsCreateUrl.replace(/%s/g, search),
      });
    } else if (command === "foregroundSearch") {
      chrome.tabs.create({
        active: true,
        url: tabsCreateUrl.replace(/%s/g, search),
      });
    }
  } catch (error) {
    console.log(error);
  }
});
// Define a Promise that resolves to the contextMenusTitle value
const contextMenusTitlePromise = chrome.storage.sync.get({
  contextMenusTitle: "Search in background for '%s'"
});

// Create a context menu item with a custom title
contextMenusTitlePromise.then(({ contextMenusTitle }) => {
  chrome.contextMenus.create({
    id: "backgroundSearchCustom",
    title: `${contextMenusTitle}`,
    contexts: ["selection"],
    documentUrlPatterns: contextMenusTitle ? ["http://*/*", "https://*/*"] : []
  });
});

// Add a click event listener
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId.startsWith("backgroundSearch")) {
    try {
      const { tabsCreateUrl } = await tabsCreateUrlPromise;
      const search = encodeURIComponent(info.selectionText);
      chrome.tabs.create({
        active: false,
        url: tabsCreateUrl.replace(/%s/g, search),
      });
    } catch (error) {
      console.log(error);
    }
  }
});
