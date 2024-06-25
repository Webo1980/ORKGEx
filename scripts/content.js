// This script handles interactions with the web page
const openAIEndPoint = "https://api.openai.com/v1/chat/completions";
const apiKey = ""; // Replace with your OpenAI API key

// Object to store highlighted text and their properties
let highlightedText = {};
let selectedImages = [];

// Add a variable to track the selected text
let selectedText = "";

// Function to handle the highlighting of selected text
function highlightText(property,propertyId) {
  console.log(propertyId);
  if (document.contentType === "application/pdf") {
    console.log("PDF content is detected; implement PDF highlighting logic here.");
  } else {
    const selection = window.getSelection();
    console.log(selection);
    // Create a container div
    const container = document.createElement("div");
    container.classList.add("highlight-container");
    container.style.display = "inline"
    container.style.margin = "0"; 
    container.style.padding = "0";
    console.log('selection.toString');
    if (selection.toString() !== "") {
      const range = selection.getRangeAt(0);
      

      // Create highlighted span
      const span = document.createElement("span");
      const color = getRandomColor();
      span.style.backgroundColor = color;
      span.classList.add("highlighted-text");
      span.setAttribute("data-property", property.label);
      span.textContent = selection.toString(); // Set the content of the highlighted span

      // Create delete icon as inline SVG
      const deleteIcon = createSvgIcon("delete-highlight-" + property.label, "#FF0000", "M12 2H9L8 0H7L6 2H3C2.45 2 2 2.45 2 3V4H14V3C14 2.45 13.55 2 13 2M4 6V13C4 14.1 4.9 15 6 15H10C11.1 15 12 14.1 12 13V6H4Z");
      // Add a click event listener to the delete icon
      deleteIcon.addEventListener("click", () => {
        removeHighlight(property.label);
      });

      // Append the highlighted span and icons to the container
      container.appendChild(span);
      container.appendChild(deleteIcon);

      // Replace the selected range with the container
      range.deleteContents();
      range.insertNode(container);

      const text = selection.toString();
      highlightedText[text] = { property, color };
      chrome.runtime.sendMessage({
        action: "highlight",
        property,
        hasHighlightedText: true,
        text: text, // Include the highlighted text
      });
    }
    else if (isTableOrDivLikeTable(selection.anchorNode)) {
        // Handle table or div-like table highlighting
        const tableData = getTableData(selection.anchorNode);
        // Create a pre element to display the JSON
        const preElement = document.createElement("pre");
        preElement.textContent = JSON.stringify(tableData, null, 2);
        container.appendChild(preElement);
  
        // Create delete icon as inline SVG
        const deleteIcon = createSvgIcon(
          "delete-highlight-" + property.label,
          "#FF0000",
          "M12 2H9L8 0H7L6 2H3C2.45 2 2 2.45 2 3V4H14V3C14 2.45 13.55 2 13 2M4 6V13C4 14.1 4.9 15 6 15H10C11.1 15 12 14.1 12 13V6H4Z"
        );
        // Add a click event listener to the delete icon
        deleteIcon.addEventListener("click", () => {
          removeHighlight(property.label);
        });
  
        // Append the delete icon to the container
        container.appendChild(deleteIcon);
  
        // Send the table data to the popup
        chrome.runtime.sendMessage({
          action: "highlight",
          property,
          hasHighlightedText: true,
          text: highlightedContent, // Include the highlighted text
          tableData: tableData,
        });
    }
 }
}

function removeImageSelection(deleteIconId, imagePath) {
  console.log(deleteIconId);
  const deleteIcon = document.getElementById(deleteIconId);
  if (deleteIcon) {
    // Remove the delete icon
    deleteIcon.parentNode.remove();

    // Send a message to the background script to delete the image data
    chrome.runtime.sendMessage({ action: "deleteImageData", imagePath: imagePath });
  }
}

function selectImage(){
  // const imageData = [];
  const selection = window.getSelection();
  //console.log(selection.anchorNode, selection.anchorNode instanceof HTMLImageElement);
  const divNode = selection.anchorNode;
  const imgNode = divNode.querySelector('img');
  console.log(imgNode);
  const imageContainer = document.createElement("div");
  
  // Replace the selected range with the container
  const range = selection.getRangeAt(0);
  //range.deleteContents();
  range.insertNode(imageContainer);

  // Handle image selection
  const imagePath = getImagePath(imgNode);
  console.log(imagePath);
  // Handle image highlighting
  const imageAlt = getImageAlt(imgNode);
  console.log(imageAlt); 

  // Create delete icon as inline SVG with a unique ID
  const deleteIconId = `delete-icon-${Date.now()}-${Math.random().toString(36).substring(7)}`; // Generate a unique ID
  const deleteIcon = createSvgIcon(deleteIconId, "#FF0000", "M12 2H9L8 0H7L6 2H3C2.45 2 2 2.45 2 3V4H14V3C14 2.45 13.55 2 13 2M4 6V13C4 14.1 4.9 15 6 15H10C11.1 15 12 14.1 12 13V6H4Z");

  const selectedImage = { imagePath, imageAlt, deleteIconId };
  selectedImages.push(selectedImage);

  // Add a click event listener to the delete icon
  deleteIcon.addEventListener("click", () => {
    removeImageSelection(deleteIconId, imagePath);
    //deleteIcon.parentNode.remove();
  });

  // Append the highlighted span and icons to the container
  imageContainer.appendChild(deleteIcon);

  return selectedImages;
}
// Helper function to check if the node is a table or div-like table
function isTableOrDivLikeTable(node) {
  return (
    (node instanceof HTMLTableElement || (node instanceof HTMLDivElement && node.querySelector("table"))) &&
    !node.closest("thead") && // Exclude tables within thead
    !node.closest("tfoot") // Exclude tables within tfoot
  );
}

// Helper function to get the image path
function getImagePath(imageNode) {
  return imageNode.src || "";
}

// Helper function to get the image alt
function getImageAlt(imageNode) {
  return imageNode.alt || "";
}

// Helper function to get table data
function getTableData(tableNode) {
  const tableData = {
    rows: [],
  };

  // Loop through rows and cells to get table data
  const rows = tableNode.querySelectorAll("tr");
  rows.forEach((row) => {
    const rowData = [];
    const cells = row.querySelectorAll("td, th");
    cells.forEach((cell) => {
      rowData.push(cell.textContent);
    });
    tableData.rows.push(rowData);
  });

  return tableData;
}

// Function to create an SVG icon
function createSvgIcon(id, fill, pathData) {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.id = id;
  icon.style.cursor = "pointer";
  icon.setAttribute("width", "16");
  icon.setAttribute("height", "16");
  icon.innerHTML = `<path fill="${fill}" d="${pathData}"/>`;
  return icon;
}

// Function to get a random color for highlighting
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Function to remove the highlight from the selected text
function removeHighlight(property) {
  const highlightedElements = document.querySelectorAll(`[data-property="${property}"]`);
  highlightedElements.forEach((element) => {
    const deleteIconId = "delete-highlight-" + property;
    const deleteIcon = document.getElementById(deleteIconId);
    if (deleteIcon) {
      deleteIcon.remove(); // Remove the delete icon
    }
    element.outerHTML = element.innerHTML;
    // Send a message to the background script to update the highlightedText object
    chrome.runtime.sendMessage({ action: "update_highlighted_text", property });
  });
}



// Event listener to handle messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "highlight") {
    highlightText(message.property,message.property.id);
    // highlightImage();
  } else if (message.action === "remove_highlight") {
    const property = message.property;
    removeHighlight(property);
  }
});


// Event listener to handle the right-click event
document.addEventListener("contextmenu", (event) => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText !== "") {
    const selectedTextPosition = { top: event.clientY, left: event.clientX };
  }
});


// Listen for property selections and send a message to the background script
function handlePropertySelection(property) {
  chrome.runtime.sendMessage({ action: "property_selected", property });
}

// Listen for clicks on property buttons and trigger the selection
document.querySelectorAll(".property-button").forEach((button) => {
  button.addEventListener("click", () => {
    const property = button.textContent;
    handlePropertySelection(property);
  });
});

// Event listener to show property name on hover
document.addEventListener("mouseover", (event) => {
  if (event.target.classList.contains("highlighted-text")) {
    const property = event.target.getAttribute("data-property");
    event.target.title = property;
  }
});


// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "remove_highlight") {
    const property = message.property;
    removeHighlight(property);
  }
});


function removeAllHighlights() {
  const highlightedElements = document.querySelectorAll(".highlighted-text");
  highlightedElements.forEach((element) => {
    const property = element.getAttribute("data-property");
    const deleteIconId = "delete-highlight-" + property;

    // Remove delete icon element with ID "delete-highlight-{property}"
    const deleteIcon = document.getElementById(deleteIconId);
    if (deleteIcon) {
      deleteIcon.remove();
    }

    // Remove the highlighted text element
    element.outerHTML = element.innerHTML;

    // Send a message to the background script to update the highlightedText object
    chrome.runtime.sendMessage({ action: "update_highlighted_text", property });
  });

  // Clear the highlightedText object
  highlightedText = {};
}


// Event listener to handle messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "remove_all_highlights") {
    removeAllHighlights();
  }
});


// Add a new function to fetch the best-matching property from OpenAI
async function fetchBestMatchingProperty(selectedText) {
  
  const prompt = "Act as an ORKG researcher. Given the selected text: '" + selectedText + "', identify the most suitable property names. Provide a JSON array of concise property names, each with a maximum of three to four properties. Only include the property names without values or additional information. Format the response as follows: ['property1', 'property2', 'property3']";
  console.log(prompt);
  try {
    // Send a request to OpenAI to match the selected text with ORKG properties
    const response = await fetch(openAIEndPoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // Specify the model name here
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 50, // Adjust as needed
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch property suggestions from OpenAI");
    }

    const data = await response.json();
    const responseContent = data.choices[0].message.content;

    if (responseContent) {
      // Extract property names as an array from the response string
      const propertyNames = responseContent.match(/'([^']+)'/g).map(name => name.replace(/'/g, ''));
      return propertyNames;
    } else {
      // If no match is found, ask OpenAI to recommend a property name
      return fetchPropertyRecommendation(selectedText);
    }
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Function to get property name suggestions from OpenAI
async function fetchPropertyRecommendation(selectedText) {
  try {
    // Send a request to OpenAI to recommend a property name
    const response = await fetch(openAIEndPoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`, // Replace with your OpenAI API key
      },
      body: JSON.stringify({
        prompt: `Suggest a property name for: "${selectedText}"`,
        max_tokens: 5, // Adjust as needed
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch property suggestions from OpenAI");
    }

    const data = await response.json();
    return data.choices.map((choice) => choice.text);
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Event listener to handle text selection
document.addEventListener("mouseup", async () => {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  console.log(selectedText);
  if (selectedText !== "") {
    try {
      const suggestion = await fetchBestMatchingProperty(selectedText);
      // Send selected text and suggestion to the background script
      console.log(suggestion);
      chrome.runtime.sendMessage({
        action: "update_suggestions",
        suggestion: suggestion,
        selectedText: selectedText,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }else{
        // Check if the selection is an image
        const target = event.target;
        console.log(target.tagName);
        if (target.tagName === "IMG") {
          console.log("send image data");
          // Send the image path to the popup
          const imageData = selectImage();
          console.log(imageData);
          chrome.runtime.sendMessage({
            action: "select_image",
            hasSelectedImages: true,
            imageData: imageData
          });
        }
  }
});


// Listen for messages from the popup script to remove the delete icon
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "remove_image_highlight") {
    const deleteIconId = message.deleteIconId;
    const deleteIcon = document.getElementById(deleteIconId);
    if (deleteIcon) {
      deleteIcon.parentNode.remove(); // Remove the delete icon element
    }
  }
});
