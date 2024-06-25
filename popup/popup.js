// This script handles the popup UI
// popup.js
const serverURL = "https://incubating.orkg.org/";

let selectedText = ""; // Store the selected text

let selectedImages = {}; // Store the selected images

let modifiedHighlightedText = ""; // Store modified highlighted Text object, after adding the data type
let annotatedImageObject = ""; // Store Annotated image object
const textReport = document.getElementById("text-report");

// Generic Functions
function createTableHeader(table, headerTitles) {
  // Insert header row
  const headerRow = table.insertRow();
  headerTitles.forEach(title => {
    const headerCell = headerRow.insertCell();
    headerCell.textContent = title;
  });
}

function createIcon(iconClass = "", style = {}, title = "", eventListeners = {}) {
  const icon = document.createElement("i");
  if (iconClass) {
    icon.classList.add(...iconClass.split(" ")); // Split the class names if multiple classes are provided
  }
  
  if (style) {
    Object.assign(icon.style, style);
  }
  
  icon.title = title;

  if (eventListeners) {
    for (const [eventName, listener] of Object.entries(eventListeners)) {
      icon.addEventListener(eventName, listener);
    }
  }

  return icon;
}

// Listener to receive selected images from storage
chrome.storage.local.get("storedSelectedImages", function(data) {
  const selectedImages = data.storedSelectedImages;

  // Create table element
  const imagesReport = document.getElementById("images-report");

  // Check if the target element exists
  if (imagesReport) {
    // create the table header
    createTableHeader(imagesReport, ["Order", "View Annotations", "Image", "#"])
     
    // Loop through the image data and create rows for each image
    if (selectedImages && Object.keys(selectedImages).length > 0) { // Check if selectedImages is an object
      selectedImages.forEach((image, index) => {
        console.log(index)
        const row = imagesReport.insertRow();
  
        // Column 1: Order
        const orderCell = row.insertCell();
        orderCell.textContent = index + 1; // Start order from 1
          
        // Column 2: Split View Link
        const splitViewCell = row.insertCell();
        const splitViewLink = document.createElement("a");
        splitViewLink.textContent = "Image Annotation View";
        splitViewLink.href = "#"; // Set href to "#" for demonstration purposes
        splitViewLink.addEventListener("click", function(event) {
          event.preventDefault();
          openSplitView(image);
        });
        splitViewCell.appendChild(splitViewLink);
  
        // Column 3: Image
        const imageCell = row.insertCell();
        const imageElement = document.createElement("img");
        imageElement.src = image.imagePath;
        imageElement.alt = image.imageAlt;
        imageElement.style.maxWidth = "100px"; // Adjust the maximum width of the image if needed
        imageCell.appendChild(imageElement);
  
        // Column 4: Delete Icon
        const deleteCell = row.insertCell();
        const deleteIcon = createIcon(
            "fas fa-trash-alt delete-icon",
            { cursor: "pointer" },
            "Delete Image",
            {
              click: function(event) {
                event.preventDefault();
                deleteImage(image.deleteIconId, image.imagePath);
                row.remove(); // Remove the row from the table
              }
            }
        );
        deleteCell.appendChild(deleteIcon);
      });
    }
  } else {
        console.error("Unable to find target element 'images-tab'."); // Update error message
  }
});

// Function to delete image data
function deleteImage(deleteIconId, imagePath) {
  chrome.runtime.sendMessage({ action: "deleteImageData", deleteIconId: deleteIconId, imagePath: imagePath });
  
  // Send a message to the content script to remove the delete icon around the selected image
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: "remove_image_highlight", deleteIconId: deleteIconId });
  });
}

function openSplitView(image) {
  // Create a new window for the split view
  const splitViewWindow = window.open("", "_blank", "width=750,height=600");

  // Write HTML content for the split view window
  splitViewWindow.document.write(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
      <link rel="stylesheet" type="text/css" href="popup.css">
      <title>Annotation View for the image: ${image.imageAlt}</title>
  </head>
  <body>
      <span class="header-text" id="annotation-header">
        <span class="text">Image Metadata</span>
      </span>
      <div id="image-metadata-container" class="container">
        <div id="image-view" style="text-align:center;">
            <image alt="${image.imageAlt}" src="${image.imagePath}" width="700" />
            <br><br>
            <span style="display: flex; justify-content: center">${image.imageAlt}</span>
        </div>
      </div>
      <hr id="seperator">
      <span class="header-text" id="annotation-header">
        <span class="text">
           Image Annotation Review
          <span style="margin:3px;">
            <i class="fas fa-question-circle" aria-label="Help Icon" title="You can easily manage your items by dragging and dropping them. Moreover, simply double-click on any item to edit it. Your changes are automatically saved when you finish editing and leave the item."></i>
          </span>    
        </span>
        </span>
      <div id="report-container" class="container">
        <div id="image-annotation-container">
            <div id="new-triple" style="display: flex; justify-content: end; padding: 5px; color: red; font-size:16px;">
              <i class="fas fa-plus" aria-label="Add Item" title="Add Item" style="cursor: pointer;"></i>
            </div>
            <!-- Annotation items will be added here -->
        </div>
      </div>
      <script src="splitView.js"></script>
  </body>
  </html>  
  `);
  localStorage.setItem('currentImage', JSON.stringify(image));
}

// Receive data from child window (SplitView.js)
window.addEventListener("message", receiveAnnotatedImageData, false);

function receiveAnnotatedImageData(event) {
  // Access the data sent from the child window
  var receiveAnnotatedData = event.data;
  annotatedImageObject = receiveAnnotatedData;
  console.log(receiveAnnotatedData, annotatedImageObject);
  // Do something with the received data
}

console.log(annotatedImageObject);
// Function to handle text selection and enable the button
function handleSelection() {
  let anyConditionMet = false;

  // Check for selected images
  chrome.storage.local.get(["storedSelectedImages"], function(data) {
    console.log("Selected images:", data.storedSelectedImages);
    if (data.storedSelectedImages && Object.keys(data.storedSelectedImages).length > 0) {
      console.log("Selected images exist");
      anyConditionMet = true;
      enableButton();
    } else {
      console.log("Selected images do not exist");
      checkConditions();
    }
  });

  // Check for highlighted text
  chrome.runtime.sendMessage({ action: "get_highlighted_text_status" }, (response) => {
    console.log("Highlighted text:", response.hasHighlightedText);
    if (response.hasHighlightedText) {
      console.log("Highlighted text exists");
      anyConditionMet = true;
      enableButton();
    } else {
      console.log("Highlighted text does not exist");
      checkConditions();
    }
  });

  // Function to enable button if any condition is met
  function checkConditions() {
    if (anyConditionMet) {
      enableButton();
    } else {
      disableButton();
    }
  }

  function enableButton() {
    document.getElementById("generate-report").removeAttribute("disabled");
  }

  function disableButton() {
    document.getElementById("generate-report").setAttribute("disabled", "true");
  }
}

// Call handleSelection when the popup loads
handleSelection();

// Function to send a message to the content script
function highlightText(property) {
  console.log(property);

  // enable the report generation button, when the user clicks on a property button
  document.getElementById("generate-report").removeAttribute("disabled");

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "highlight", property, propertyId: property.id });
  });
}

async function extractDoiFromUrl(url) {
  try {
    // Fetch the HTML content of the webpage
    const response = await fetch(url);
    const html = await response.text();

    // Create a virtual DOM element
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Regular expression to match DOI patterns
    const doiPattern = /(?:10\.\d{4,}\/[^\s'"]+)(?="|')/;

    // Find all elements in the body
    const bodyElements = doc.body.querySelectorAll('*');

    // Extract DOI from each element
    const dois = Array.from(bodyElements)
      .map(element => {
        const htmlContent = element.outerHTML || '';
        const matches = htmlContent.match(doiPattern);
        return matches ? matches[0] : null;
      })
      .filter(doi => doi !== null);

    // Return the first matched DOI
    const doi = dois.length > 0 ? dois[0] : null;

    return doi;
  } catch (error) {
    console.error('Error fetching or parsing the webpage:', error);
    return null;
  }
}
// Function to extract DOI from the current tab's URL
async function extractDoiFromCurrentTab() {
  try {
    // Get the current tab's URL
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
      const currentTabUrl = tabs[0].url;

      // Call the function to extract DOI
      const doi = await extractDoiFromUrl(currentTabUrl);
      // Use the extracted DOI as needed
      if (doi) {
        console.log('DOI:', doi);
        const metadata = document.getElementById("metadata");
        metadata.value = doi;
        detectResearchField(doi);
      } else {
        console.log('DOI not found on the webpage.');
        // Handle the case where DOI is not found
        const wrongDoi = document.getElementById("wrong-doi");
        wrongDoi.style.display = "block";
      }
    });
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

async function detectResearchField(doi){
    const paperObject = await fetchMetaData(doi);
    const annotationResult = await findRelatedResearchField(serverURL + 'nlp/api/annotation/rfclf', paperObject.abstract, 5);
    console.log(annotationResult);  
    // Check if there is a result from the annotation request
    if (annotationResult && Object.keys(annotationResult).length > 0) {
      const topResearchField = annotationResult.payload.annotations[0].research_field; // Assuming the top result is the desired research problem
      console.log(annotationResult);
      const  researchFieldInfo = await fetchResearchFieldInfo(topResearchField);
      const researchFieldObject = researchFieldInfo.content.find(item => item.classes.includes("ResearchField"));
      if (researchFieldObject) {
       console.log(researchFieldObject.id);
      } else {
        console.log("No object with class ResearchField found.");
      }
      researchFieldId = researchFieldObject.id;

      // save the research field ID in the form
      const researchFieldInput = document.getElementById("researchField");
      researchFieldInput.value = researchFieldId;

      const researchFieldURL = serverURL + 'resource/' + researchFieldId;
      researchFieldDiv.innerHTML = "<a target='_blank' title='"+researchFieldURL+"' href='"+researchFieldURL+"'>" + topResearchField + "</a>  ";
      
      // Add the help icon cell next to the research field
      const helpIcon = createIcon(
        "fas fa-question-circle",
        { cursor: "pointer" },
        "The AI detected the ORKG relevant research field based on the paper's abstract. If you think the research field is not relevant, you can click on the refresh icon",
        {
          mouseover: function() {
            helpIcon.classList.add("hide-tooltip");
          },
          mouseout: function() {
            helpIcon.classList.remove("hide-tooltip");
          }
        }
      );
      researchFieldDiv.appendChild(helpIcon);

      // Add a space between the help icon and the refresh icon
      researchFieldDiv.appendChild(document.createTextNode(" "));

      // Add the refresh icon next to the help icon
      const refreshIcon = createIcon(
        "fas fa-sync-alt",
        { cursor: "pointer" },
        "Refresh research field",
        { click: async () => {
            // Fetch and update the research field again
            console.log(doi);
            await detectResearchField(doi);
          }
        }
      );
      // Append the refresh icon to the researchFieldDiv
      researchFieldDiv.appendChild(refreshIcon);
    }
 }


// Function to fetch properties from the API based on user input
async function fetchPropertiesFromORKG(query) {
  try {
    let apiUrl;

    if (query.trim() === "") {
      // Fetch initial properties
      apiUrl = serverURL+"api/predicates/?size=10"; // Adjust the size parameter as needed
    } else {
      // Query the graph based on user input
      apiUrl = serverURL+`api/predicates/?q=${encodeURIComponent(query)}`;
    }

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch properties from the API");
    }

    const data = await response.json();

    // Return an array of objects containing "label" and "id" fields
    return data.content.map((item) => ({ label: item.label, id: item.id }));
  } catch (error) {
    console.error(error);
    return [];
  }
}

// Function to populate and filter property suggestions
async function updatePropertySuggestions(inputValue) {
  const propertiesDiv = document.getElementById("properties");
  propertiesDiv.innerHTML = "";

  try {
    const properties = await fetchPropertiesFromORKG(inputValue);
    
    properties.forEach((property) => {
      const button = document.createElement("button");
      button.textContent = property.label;

      // Set the button id as the property id
      button.id = property.id;
      button.setAttribute('property-name', property.label);
      // Add a class to control the visibility of the custom tooltip
      button.addEventListener("mouseover", () => {
        button.classList.add("hide-tooltip");
      });

      // Remove the class when the mouse leaves the button
      button.addEventListener("mouseout", () => {
        button.classList.remove("hide-tooltip");
      });

      button.addEventListener("click", () => {
        console.log(property);
        highlightText(property);
      });
      propertiesDiv.appendChild(button);
    });
  } catch (error) {
    console.error(error);
  }
}

// Function to show the properties list next to the selected text
function showPropertiesList(selectedText, selectedTextPosition) {
  const propertiesList = document.getElementById("properties-list");
  propertiesList.style.display = "block";

  // Position the properties list next to the selected text
  propertiesList.style.top = (selectedTextPosition.top + window.scrollY) + "px";
  propertiesList.style.left = (selectedTextPosition.right + window.scrollX) + "px";

  // Now, you can use the 'selectedText' to highlight the text.
  if (selectedText) {
    highlightText(selectedText);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "show_properties") {
    const selectedText = message.selectedText;
    // Update the properties list in the popup
    updatePropertiesList(properties);
    // Show the popup (if it's not already open)
    showPropertiesList();
  }
});

// Function to update the properties list in the popup
function updatePropertiesList(properties) {
  const propertiesList = document.getElementById("properties-list");
  propertiesList.innerHTML = properties;
}

// Add an event listener to the input element
document.getElementById("property-input").addEventListener("input", (event) => {
  updatePropertySuggestions(event.target.value);
});


document.addEventListener("DOMContentLoaded", function() {
  // Call updatePropertySuggestions when the popup loads
  updatePropertySuggestions("");

  // Call the updatePopupContent function to update the popup when it's opened
  updatePopupContent();

  // Function to switch between tabs
  function openTab(tabName) {
    // Declare variables
    var i, tabcontents, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontents = document.querySelectorAll(".tabcontent");
    tabcontents.forEach(function(tabcontent) {
      tabcontent.style.display = "none";
    });

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.querySelectorAll(".tablinks");
    tablinks.forEach(function(tablink) {
      tablink.classList.remove("active");
    });

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabName + "-tab").style.display = "block";
    document.querySelector('[data-tab="' + tabName + '"]').classList.add("active");

    // Call the function to extract DOI from the current tab's URL
    extractDoiFromCurrentTab();

    const metadataInput = document.getElementById('metadata');
    
    metadataInput.addEventListener('input', async function () {
      console.log(metadataInput.value);
      await detectResearchField(metadataInput.value);
    });
  }

  // Attach click event handlers to tab buttons
  var tabButtons = document.querySelectorAll(".tablinks");
  tabButtons.forEach(function(button) {
    button.addEventListener("click", function() {
      openTab(this.getAttribute("data-tab"));
    });
  });

  // Open the default tab (Text)
  openTab("text");
});


// Add an event listener to handle report generation
document.getElementById("generate-report").addEventListener("click", () => {
  const reportContainer = document.getElementById("report-container");
  const annotationHeader = document.getElementById("annotation-header");
  const metadataHeader = document.getElementById("metadata-header");
  const metadataContainer = document.getElementById("metadata-container");
  
  const textReport = document.getElementById("text-report");

  // Add the header row to the report table
  const headerRow = textReport.insertRow();
  const headers = ["Property Name", "Highlighted Text", "Data Type", "#"];
  headers.forEach((headerText) => {
    const headerCell = headerRow.insertCell();
    headerCell.textContent = headerText;
    if(headerText == "Data Type") {
      // Add a space between the Data Type and the help icon
      headerCell.appendChild(document.createTextNode(" "));
      // Create the help icon
      const helpIcon = createIcon(
        "fas fa-question-circle",
        { cursor: "pointer" },
        "The data type is determined automatically by the AI. It is highly recommended to keep it like that. But you are still able to modify it.",
        {
          mouseover: () => {
            helpIcon.classList.add("hide-tooltip");
          },
          mouseout: () => {
            helpIcon.classList.remove("hide-tooltip");
          }
        }
      );

      // Append the help icon to the headerCell
      headerCell.appendChild(helpIcon);      
    }
  });

  // Function to create and populate the datatype dropdown menu
  function createDataTypeDropdown() {
    const dataTypes = ["Resource","Text", "Decimal", "Integer", "Boolean", "Date", "URL"];
    const dropdown = document.createElement("select");
    dropdown.id = "dataTypeDropdown";

    // Add options to the dropdown
    dataTypes.forEach(type => {
      const option = document.createElement("option");
      option.value = type;
      option.text = type;
      dropdown.appendChild(option);
    });

    return dropdown;
  }

  // Function to make an API request to check if the label is a literal
  async function checkLiteralType(label) {
    const apiUrl = serverURL+"nlp/api/tools/text/chatgpt";
    const requestBody = {
      task_name: "checkIfLiteralTypeIsCorrect",
      placeholders: { label },
      temperature: 0
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API request failed. Status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async function ORKGDataTypeMapping(label) {
    const dataTypeDropdown = document.getElementById("dataTypeDropdown");
    // Make API request to check if the label is a literal
    const isLiteral = await checkLiteralType(label);
    // Update the dropdown selection based on the API response
    console.log(isLiteral);
    if (isLiteral) {
      const feedback = isLiteral.payload.arguments.feedback;
      console.log(feedback);
      // Determine if it should be a resource or literal
      const shouldBeResource = feedback.includes("it is an atomic concept") || feedback.includes("it is an atomic entity") || feedback.includes("it is an atomic resource") || feedback.includes("should be a resource");
      console.log(shouldBeResource);
      if (shouldBeResource) {
        // Example response for a resource label
        return { type: "Resource", feedback }; // Return an object with type and feedback properties
      } else {
        // Extract data type from the label content for literal label
        console.log(label);
        // Default to "text" if no specific type is identified
        let literalType = "Text";
        // Remove commas for the purpose of number validation
        var labelWithoutCommas = label.replace(/,/g, '');
        // Check for specific data type patterns in the label content
        if (/^\d+$/.test(labelWithoutCommas)) {
          literalType = "Integer";
        } else if (/^\d+(\.\d+)?$/.test(labelWithoutCommas)) {
          literalType = "Decimal";
        } else if (/^(true|false)$/i.test(label)) {
          literalType = "Boolean";
        } else if (/^https?:\/\//i.test(label)) {
          literalType = "URL";
        } else if (/\d{4}-\d{2}-\d{2}/.test(label)) {
          literalType = "Date";
        }
        console.log(label, literalType);
        return { type: literalType, feedback }; // Return an object with type and feedback properties
      }
    } else {
      // Example response for a resource label
      return { type: "text", feedback }; // Return an object with type and feedback properties
    }
  }  

  // Request the highlighted text from the background script
  chrome.runtime.sendMessage({ action: "get_highlighted_text" }, async (response) => {
    // Get references to the button and loading icon
    const generateReportButton = document.getElementById("generate-report");
    //const loadingIcon = document.getElementById("loading-icon");
  
    // Manually set the style properties for a disabled appearance
    disableButton(generateReportButton);
    generateReportButton.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
    const highlightedText = response.highlightedText;
    console.log(highlightedText);

    // Generate and display the report
    for (const propertyId in highlightedText) {
      if (highlightedText.hasOwnProperty(propertyId)) {
        const property = highlightedText[propertyId];
        const text = property.text; //highlightedText[property];
        const row = textReport.insertRow();

        // Create the property cell
        const propertyCell = row.insertCell(0); // Property name is in the first column
        propertyCell.textContent = property.label;
        propertyCell.id = "property-cell";
        // propertyCell.title = "ORKG Id: "+propertyId;
        propertyCell.classList.add("property-cell");

        // Create the text cell
        const textCell = row.insertCell(1); // Highlighted text is in the second column
        textCell.textContent = text;
        textCell.id = "text-cell";
        textCell.classList.add("text-cell");

        // Create the datatype cell
        const dataType = await ORKGDataTypeMapping(text.trim());
        console.log(dataType);
        const dataTypeCell = row.insertCell(2); // data type is in the third column
        const dataTypeDropdown = createDataTypeDropdown();
        dataTypeDropdown.value = dataType.type;
        dataTypeCell.appendChild(dataTypeDropdown);

        // Add white space before the info icon
        const spaceTextNode = document.createTextNode(" ");
        dataTypeCell.appendChild(spaceTextNode);

        // Create the info icon
        const infoIcon = createIcon(
          "fas fa-info-circle info-icon",
          { cursor: "pointer" },
          "AI feedback: " + dataType.feedback
        );

        // Append the info icon to the dataTypeCell
        dataTypeCell.appendChild(infoIcon);

        // Add dataType property to the property object
        property.dataType = dataType.type;
        modifiedHighlightedText = highlightedText;

        // Add event listener to the dropdown to capture user changes
        dataTypeDropdown.addEventListener('change', function () {
          property.dataType = this.value; // Update the dataType property
          modifiedHighlightedText = highlightedText;
        });

        dataTypeCell.id = "data-type-cell";
        dataTypeCell.classList.add("text-cell");

        // Create the delete icon cell
        const deleteCell = row.insertCell(3); // Delete icon is in the third column
        const deleteIcon = createIcon(
          "fas fa-trash-alt delete-icon",
          { cursor: "pointer" },
          "Delete the highlight"
        );
        // Add click event listener to the delete icon
        deleteIcon.addEventListener("click", () => {
          // Handle the delete action here
          deleteAnnotation(property.label);
          row.remove(); // Remove the entire row when the delete icon is clicked

          // Check if the table has no more rows
          if (textReport.rows.length === 1) { // 1 row for the table header
            hideAnnotationBlock();
          }
        });
        // Insert the delete icon into the delete cell
        deleteCell.appendChild(deleteIcon);
      }
    }
    
    // return the orginal button state
    generateReportButton.innerHTML = 'Review Annotation';
    disableButton(generateReportButton);  //disable to avoid re-rendering the table over and over  
    console.log(highlightedText);
    reportContainer.style.display = "block";
    annotationHeader.style.display = "block";
    metadataHeader.style.display = "block";
    metadataContainer.style.display = "block";
  });
});

// Function to manually set the style properties for a disabled appearance
function disableButton(button){
  button.style.backgroundColor = "#777";
  button.style.color = "#ccc";
  button.style.cursor = "not-allowed";
}

// Function to manually set the style properties for a enable appearance
function enableButton(button){
  button.removeAttribute("style");
}
// Function to delete all rows and hide the annotation header and report container
function deleteAllRows() {
  // Remove all rows except the header row
   while (textReport.rows.length > 1) {
     textReport.deleteRow(1);
   }

  hideAnnotationBlock();
}

async function findRelatedResearchField(url, abstract, topN) {
  console.log(url);
  const requestBody = {
    raw_input: `${abstract}`,
    top_n: topN || 5,
  };
  console.log(requestBody);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to make the annotation request. Status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data); // Log the result
    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}


function hideAnnotationBlock() {
  // Hide the annotation header and report container
  document.getElementById("annotation-header").style.display = "none";
  document.getElementById("report-container").style.display = "none";
  document.getElementById("metadata-container").style.display = "none";

  // Disable the "Generate Report" button and apply the #generate-report:disabled class
  const generateReportButton = document.getElementById("generate-report");
  generateReportButton.setAttribute("disabled", "true"); // Disable the button
  // Manually set the style properties for a disabled appearance
  disableButton(generateReportButton);
}


function deleteAnnotation(property) {
  // Remove the annotation from the report table
  const rows = textReport.getElementsByTagName("tr");
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.cells[0].textContent === property) {
      textReport.deleteRow(i);
      break;
    }
  }

  // Send a message to the content script to remove the highlight
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "remove_highlight", property });
  });
}

async function fetchMetaData(doi) {
  const semanticScholarUrl = `https://api.semanticscholar.org/v1/paper/${encodeURIComponent(doi)}`;
  console.log(semanticScholarUrl);
  const response = await fetch(semanticScholarUrl);
  const paperInfo = await response.json();
  console.log(paperInfo);
  return paperInfo;
}
async function fetchResearchFieldInfo(researchField) {
  const ORKGResearchFieldEndpoint = `${serverURL}api/resources/?q=${researchField}`;
  console.log(ORKGResearchFieldEndpoint);
  const response = await fetch(ORKGResearchFieldEndpoint);
  const researchFieldInfo = await response.json();
  console.log(researchFieldInfo);
  return researchFieldInfo;
}

async function openNewWindowWithReport(data, metadataInput, researchFieldId, downlaod,annotatedImageObject) {
  console.log(data,annotatedImageObject);
  const url = serverURL + "api/papers/";
  const metadataValue = metadataInput.value;
  const researchFieldValue = researchFieldId.value
  console.log(researchFieldValue);
  let postData = {
    extraction_method: "MANUAL",
    contents: {
      resources: {},
      literals: {},
      predicates: {},
      lists: {},
      contributions: []
    }
  };

  // Fetch metadata and update postData
  try {
    const paperInfo = await fetchMetaData(metadataValue);
    postData = updatePostDataWithMetadata(postData, paperInfo, researchFieldValue);
  } catch (error) {
    console.error("Error fetching paper information:", error);
    return; // Stop execution in case of an error
  }

  let contributionIndex = 0; // Initialize contribution index
  if (Object.keys(data).length > 0) { // if the user highlighted text
    // Add data to contents based on provided rules
    for (const [key, value] of Object.entries(data)) {
      console.log(key, value);
      // Handle Predicates
      let predicateId = '';
      if (key.startsWith("P") && /^\d+$/.test(key.substring(1))) {   // ORKG Property  // AI Property
        predicateId = key;
      } else {
        predicateId = addPredicate(postData, key, value.label);
        console.log("I will add predicate: ", key, value);
      }
      // Handle selected text based on its type (resource, or literal)
      if (value.dataType == "Resource") {
        const resourceId = addResource(postData, key, value.text);
        addToContributions(postData, resourceId, predicateId, "ORKG Chrome Extension Annotator", contributionIndex);
        console.log("I will add resource: ", key, value);
      } else {
        const literalId = addLiteral(postData, value.text, value.dataType);
        addToContributions(postData, literalId, predicateId, "ORKG Chrome Extension Annotator", contributionIndex);
        console.log("I will add literal: ", key, value);
      }
    }
    contributionIndex++;  // increase the countribuation index by one to make the images equals 0+1
  }
  if (annotatedImageObject && Array.isArray(annotatedImageObject.data) && annotatedImageObject.data.length > 0) {
      annotatedImageObject.data.forEach(item => {
        const { subject, predicate, object, dataIndex } = item;
        
        // Handle predicate
        let predicateId = '';
        if (predicate.startsWith("P") && /^\d+$/.test(predicate.substring(1))) {
          predicateId = predicate;
        } else {
          predicateId = addPredicate(postData, predicate, subject);
          console.log("Added predicate: ", predicate, subject);
        }
        
        // Handle object based on its type (resource or literal)
        if (!isNaN(parseFloat(object)) && isFinite(object)) {
          const literalId = addLiteral(postData, object, 'Number');
          addToContributions(postData, literalId, predicateId, annotatedImageObject.alt, contributionIndex);
          console.log("Added literal: ", object, 'Number');
        } else {
          const resourceId = addResource(postData, predicate, object);
          addToContributions(postData, resourceId, predicateId, annotatedImageObject.alt, contributionIndex);
          console.log("Added resource: ", predicate, object);
        }
      });
  }
    
  
  if(downlaod !== true) {
    // Make the fetch request
    sendPaperCreationRequest(url, postData);
  } else {
    console.log(postData);
    // Create a blob from the JSON data
    const blob = new Blob([JSON.stringify(postData)], { type: 'application/json' });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ORKG_Chrome_Extension_Annotation.json'; // Set the filename

    // Append the link to the document body
    document.body.appendChild(link);

    // Trigger a click event on the link to initiate the download
    link.click();

    // Remove the link from the document body
    document.body.removeChild(link);
  }
}

// Function to update postData with metadata
function updatePostDataWithMetadata(postData, paperInfo, researchFieldId) {
  try {
    if (paperInfo.title) {
      postData.title = paperInfo.title || null;
    }
    if (paperInfo.doi) {
      postData.identifiers = { doi: [paperInfo.doi] };
    }
    if (paperInfo.authors) {
      // Remove duplicates from authors
      const uniqueAuthors = Array.from(new Set(paperInfo.authors.map(author => author.name)))
        .map(name => paperInfo.authors.find(author => author.name === name));

      postData.authors = uniqueAuthors.map(author => ({ id:null, name: author.name, homepage:null }));
    }
    if (paperInfo.venue && paperInfo.year) {
      postData.publication_info = {
        published_month: paperInfo.month || 1,
        published_year: paperInfo.year || 1970,
        published_in: paperInfo.venue ? 'conference' : null,
        url: paperInfo.url || null
      };
    }
    postData.observatories = paperInfo.observatories || [];
    postData.organizations = paperInfo.organizations || [];
    postData.research_fields = [researchFieldId] || [];
    return postData;
  } catch (error) {
    console.error('Error in updatePostDataWithMetadata:', error);
  }
}

// Function to generate a unique temporary identifier
function generateTempId(type, postData) {
  return `#${type}${Object.keys(postData.contents[type]).length + 1}`;
}

// Function to add resource to contents
function addResource(postData, id, label) {
  try {
    const resourceId = generateTempId("resources", postData);
    postData.contents.resources[resourceId] = {
      label: label,
      classes: []
    };
    //addToContributions(postData, resourceId, id);
    return resourceId;
  } catch (error) {
    console.error('Error in addResource:', error);
  }
}

// Function to add literal to contents
function addLiteral(postData, label, dataType) {
  try {
    const literalId = generateTempId("literals", postData);
    postData.contents.literals[literalId] = {
      label: label,
      data_type: "xsd:"+dataType
    };
    //addToContributions(postData, literalId, id);
    return literalId;
  } catch (error) {
    console.error('Error in addLiteral:', error);
  }
}

// Function to add predicate to contents
function addPredicate(postData, id, label) {
  try {
    const predicateId = generateTempId("predicates", postData);
    postData.contents.predicates[predicateId] = {
      "label": label || 'empty label',
      "description": 'description'
    };  
    //addToContributions(postData, predicateId, id);
    return predicateId;
  } catch (error) {
    console.error('Error in addPredicate:', error);
  }
}

// Function to add to contributions
function addToContributions(postData, id, key, label, contributionIndex) {
  console.log(postData, id, key);  // the output is object, '#predicates1' 'P2'
  try {
    if (!postData.contents.contributions) {
      postData.contents.contributions = [];
    }

    // Ensure the contribution at the specified index exists
    if (postData.contents.contributions.length <= contributionIndex) {
      // If the contribution doesn't exist, create it
      postData.contents.contributions.push({
        label: label,
        classes: [],
        statements: {} // Change to an object instead of an array
      });
    }

    // Get the contribution at the specified index
    const contribution = postData.contents.contributions[contributionIndex];

    if (!contribution) {
      // Handle the case where contribution is undefined
      console.error('Contribution at index', contributionIndex, 'is undefined');
      return postData;
    }

    // Ensure statements[key] is initialized as an array
    contribution.statements[key] = contribution.statements[key] || [];

    // Check if the id already exists in statements[key]
    const existingEntry = contribution.statements[key].find(entry => entry.id === id);

    // Add the entry with "null" value only if it doesn't exist
    if (!existingEntry) {
      contribution.statements[key].push({
        id: id,
        statements: null
      });
    }

    return postData; // Return the modified postData
  } catch (error) {
    console.error('Error in addToContributions:', error);
    return postData; // Return the original postData in case of an error
  }
}

// Function to obtain OAuth2 token
async function obtainToken() {
  const tokenUrl = serverURL+`oauth/token`; // Update with actual token URL
  const clientId = 'orkg-client'; // Update with your client ID
  const clientSecret = 'secret'; // Update with your client secret
  const username = ''; // Update with user's email 
  const password = ''; // Update with user's password

  const authString = btoa(`${clientId}:${clientSecret}`);
  const tokenRequestBody = new URLSearchParams({
    'grant_type': 'password',
    'username': username,
    'password': password
  });

  const tokenRequestOptions = {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: tokenRequestBody
  };

  try {
    const response = await fetch(tokenUrl, tokenRequestOptions);
    console.log(response.json);
    if (!response.ok) {
      throw new Error('Failed to obtain token');
    }
    const data = await response.json();
    console.log(data.access_token)
    return data.access_token;
  } catch (error) {
    console.error('Error obtaining token:', error);
    throw error;
  }
}

async function sendPaperCreationRequest(url, postData) {
  console.log(url);
  const token = await obtainToken(); // Obtain OAuth2 token
  const headers = new Headers({
    "Content-Type": "application/vnd.orkg.paper.v2+json;charset=UTF-8",
    "Accept": "application/vnd.orkg.paper.v2+json",
    "Authorization": `Bearer ${token}` // Include token in headers
  });
  console.log(headers);

  const requestOptions = {
    method: "POST",
    headers: headers,
    body: serializeToJSON(postData)
  };
  console.log(postData);

  fetch(url, requestOptions)
    .then(response => {
      console.log(response.status, response);

      if (response.ok) {
        // Handle the case where content-length is 0
        if (response.headers.get("content-length") === "0") {
          return { headers: response.headers };
        }
        return response.json();
      } else {
        return Promise.reject(`Error: ${response.status}`);
      }
    })
    .then(data => {
      const locationHeader = data.headers.get("location");
      console.log(locationHeader);
      if (locationHeader) {
        const lastPart = locationHeader.substring(locationHeader.lastIndexOf("/") + 1);
        const PaperURL = serverURL + `paper/${lastPart}`;
    
        // Open a new window with the paper URL
        window.open(PaperURL, '_blank');
    
        const userMessage = document.createElement("div");
        userMessage.innerHTML = `The paper is created and opened in a new window. If not, <a href="${PaperURL}" target="_blank">click here</a>.`;
        userMessage.style.color = "green";
        const reportContainer = document.getElementById("create-paper-div");
        reportContainer.appendChild(userMessage);
      }
    
      console.log("Response Data:", data);
    })    
    .catch(error => {
      console.error("Error:", error);

      const userMessage = document.createElement("div");
      userMessage.textContent = "Error creating the paper. Please try again.";
      userMessage.style.color = "red";
      const reportContainer = document.getElementById("create-paper-div");
      reportContainer.appendChild(userMessage);
    });
}

function serializeToJSON(obj) {
  return JSON.stringify(obj, (_, value) => {
    if (typeof value === 'undefined' ) { //|| typeof value ===null
      return undefined; // Remove undefined properties
    }
    return value;
  });
}

document.getElementById("create-paper").addEventListener("click", () => {
  const metadataInput = document.getElementById('metadata');
  const createPaperButton = document.getElementById('create-paper');

  function validateFields() {
    // const researchField = researchFieldInput.value.trim();
    const metadata = metadataInput.value.trim();

    console.log(metadataInput);
    if (metadataInput.value == "") {
      metadataInput.classList.add('error');
    } else {
      metadataInput.classList.remove('error');
    }

    return metadata;
  }

  function updateSubmitButtonState() {
    createPaperButton.disabled = !validateFields();
  }

  metadataInput.addEventListener('input', function () {
    updateSubmitButtonState();
  });

  // Add event listener for button click
  createPaperButton.addEventListener('click', function () {
    if (validateFields()) {
      // Perform the desired action (e.g., create a paper)
      console.log('Paper created!');
    }
  });

  // Initial state of the submit button
  updateSubmitButtonState();
  console.log("The button was clicked");
  // Request the highlighted text from the background script
    
    const researchFieldId = document.getElementById("researchField");
    
    openNewWindowWithReport(modifiedHighlightedText, metadataInput, researchFieldId, false,annotatedImageObject);
});

// Add event listener for download icon click
document.getElementById("download-file").addEventListener("click", () => {
  const researchFieldId = document.getElementById("researchField");
  const metadataInput = document.getElementById('metadata');
  openNewWindowWithReport(modifiedHighlightedText, metadataInput, researchFieldId, true,annotatedImageObject);
});

// Function to clear the highlight object
function clearHighlightedText() {
  highlightedText = {};
}

// Add an event listener to the "Delete All" link
document.getElementById("delete-all-link").addEventListener("click", () => {
  
  // Send a message to the content script to remove all highlights
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "remove_all_highlights" });
  });
});


function updateSuggestions(suggestions) {
  const propertiesDiv = document.getElementById("properties");

  // Create the suggestion box
  const suggestionDivElement = document.createElement('div');
  suggestionDivElement.id = 'suggestion-box';
  suggestionDivElement.innerHTML = "<span>AI Properties Suggestions:</span><br/>";

  suggestions.forEach((property) => {
    const button = document.createElement("button");
    button.textContent = property;
    button.id = property;
    button.setAttribute('property-name', property);
    button.addEventListener("click", () => {
      console.log("button is added");
      property = { label: property, id: property };   // send the suggested property id, the same as the name
      console.log(property);
      highlightText(property);
    });

    // Set the background-color directly for these buttons
    button.style.backgroundColor = "#50bf9b";

    suggestionDivElement.appendChild(button); // Append buttons to suggestionDivElement
  });

  // Add a separator line
  const separator = document.createElement('hr');
  const proprtiesSpan = document.createElement('span');
  proprtiesSpan.innerHTML = "<span>ORKG Properties:</span><br/>";

  // Append the separator and suggestion box to propertiesDiv
  propertiesDiv.appendChild(suggestionDivElement);
  propertiesDiv.appendChild(separator);
  propertiesDiv.appendChild(proprtiesSpan);
}

// Function to update the popup content with the stored AI suggestion data
function updatePopupContent() {
  chrome.storage.local.get(["storedSuggestion"], function (data) {
    const suggestion = data.storedSuggestion;

    // Handle the message and update the popup.html with the suggestion data
    if (suggestion) {
      //console.log("Received suggestion:", suggestion);
      updateSuggestions(suggestion);
    }
  });
}