let openAIResponse = null;
// Initialize variables to store the suggestion and selected text
let storedSuggestion = '';
let storedSelectedText = '';
let storedSelectedImages = '';

// Background script to create the context menu item
const contextMenuItemId = "orkgAnnotatorContextMenuItem";

// Initialize a flag to track if there's highlighted text
let hasHighlightedText = false;
const highlightedText = {};

// Initialize a flag to track images selection
let hasSelectedImages = false;
const images = [];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "highlight") {
    hasHighlightedText = message.hasHighlightedText;
    const property = message.property;
    const text = message.text; // Get the highlighted text
    //console.log(message,hasHighlightedText,hasSelectedImages);
    if(hasHighlightedText === true){
      // Store the highlighted text in the object
      highlightedText[property.id] = {label:property.label, text: text};
    }
  }
});


// Provide a way to access the highlightedText
function getHighlightedText() {
  console.log(highlightedText);
  return highlightedText;
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Listen for requests to get the highlighted text
  if (message.action === "get_highlighted_text") {
    // Send the highlighted text to the popup script
    sendResponse({ highlightedText: getHighlightedText() });
  }
});


// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "get_highlighted_text_status") {
    // Send the flag to the popup script
    sendResponse({ hasHighlightedText: hasHighlightedText});
  }
  if (message.action === "get_selected_images_status") {
    // Send the flag to the popup script
    sendResponse({ hasSelectedImages:hasSelectedImages});
  }
});

// Listen for messages from the content script to update the highlightedText object
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "update_highlighted_text") {
    console.log("I am about to remove the prop");
    delete highlightedText[message.property]; // Remove the property from the object
    console.log("The prop was deleted");
  }
});


// Listen for property selections and store the selected property
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "property_selected") {
    selectedProperty = message.property;
  } else if (message.action === "get_selected_property") {
    // Respond to request with the selected property
    selectedProperty = message.property;
    sendResponse({ selectedProperty: selectedProperty });
  }else if (message.action === "highlight") {
    // Set the flag to indicate highlighted text
    sendResponse({ hasHighlightedText: hasHighlightedText });
  }
});

// Function to create and display the suggestions box
function showSuggestionsBox(data) {
  const suggestionsBox = document.createElement("div");
  suggestionsBox.id = "suggestions-box";
  suggestionsBox.classList.add("suggestions-box");
  
  // Iterate through the suggestion properties and add them to the box
  if (data.length > 0) {
    data.forEach((property, index) => {
      const suggestionElement = document.createElement("div");
      suggestionElement.textContent = property;
      suggestionElement.classList.add("suggestion");
      suggestionElement.style.backgroundColor = "lightblue"; // Set a different background color
      suggestionsBox.appendChild(suggestionElement);
    });
  }

  // Add the suggestions box to the document
  document.body.appendChild(suggestionsBox);
}


// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "update_suggestions") {
    // Store the suggestion and selected text data in storage
    chrome.storage.local.set({
      storedSuggestion: message.suggestion,
      storedSelectedText: message.selectedText,
    });

  }

  if (message.action === "select_image") {
    hasSelectedImages = message.hasSelectedImages;
    if(hasSelectedImages === true){
      // store the selected images
      chrome.storage.local.set({ storedSelectedImages: message.imageData });
    }
  }
  console.log(message);
  if (message.action === "deleteImageData") {
    const deleteIconId = message.deleteIconId;
    const imagePath = message.imagePath;

    chrome.storage.local.get("storedSelectedImages", function(data) {
      const selectedImages = data.storedSelectedImages || [];
      const updatedImages = selectedImages.filter(image => image.imagePath !== imagePath && image.deleteIconId !== deleteIconId);
      chrome.storage.local.set({ "storedSelectedImages": updatedImages });
    });
  }
});


chrome.webNavigation.onBeforeNavigate.addListener(function(details) {
  // Clear data from chrome.storage.local
  chrome.storage.local.clear(function() {
    if (chrome.runtime.lastError) {
      console.error("Error clearing storage:", chrome.runtime.lastError);
    } else {
      console.log("Data cleared from storage.");
    }
  });
}, {url: [{schemes: ['http', 'https']}]});