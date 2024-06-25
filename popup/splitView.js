const currentImage = JSON.parse(localStorage.getItem('currentImage'));
const apiKey = ""; // Replace with your OpenAI API key
console.log(currentImage);
const imageAnnotationContainer = document.getElementById("image-annotation-container");

console.log(currentImage.imagePath);

// Define annotationData globally
let annotationData = { data: [] };
let modifiedAnnotationData = { data: [], alt : currentImage.imageAlt };

// Function to fetch the data from the server
async function fetchData(imageUrl) {
  console.log(imageUrl);
  const base64EncodedUrl = btoa(imageUrl);
  const url = `http://localhost:8508/chart_to_json?image_url=${base64EncodedUrl}`;

  console.log(url); // Check if the URL is correctly formed

  try {
    const response = await fetch(url);
    const data = await response.json();

    // Parse the JSON string in the data field
    const parsedData = JSON.parse(data.data);
    
    // Send the extracted data to OpenAI API
    const modeledData = await modelDataWithOpenAI(parsedData);
    console.log('Modeled Data:', modeledData);

    const modeledDataWithAlt = { 
      ...modeledData, 
      alt: currentImage.imageAlt 
    };
    
    // Send the modified data with alt property to OpenAI API
    console.log('Modeled Data with Alt:', modeledDataWithAlt);
    window.opener.postMessage(modeledDataWithAlt, "*");  // send the data to the popup again when it is ready
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

async function modelDataWithOpenAI(annotationData) {
  const openaiUrl = 'https://api.openai.com/v1/chat/completions';
  const prompt = `Act as a researcher and transform the following JSON object \n${JSON.stringify(annotationData)} into subject-predicate-object form. Return the data in a JSON object, strictly in the following format:
                  {
                    "data": [
                      {
                        "subject": "subject value",
                        "predicate": "predicate name",
                        "object": "object value"
                      }
                    ]
                  }
                  Ensure that each entry includes both the subject value and the predicate name.`;


  const response = await fetch(openaiUrl, {
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
      max_tokens: 1500, // Adjust as needed
    }),
  });

  const data = await response.json();
  console.log(data);
  const modeledData = JSON.parse(data.choices[0].message.content.trim());
  console.log(modeledData);
  renderTriplesView(modeledData);
  return modeledData;
}

// Call the fetchData function when the extension is loaded or when needed
fetchData(currentImage.imagePath);

// Function to create a deep copy of an object
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Function to update the modified annotation data
function updateModifiedData() {
  const itemWrappers = document.querySelectorAll(".item-wrapper");

  modifiedAnnotationData.data = []; // Clear existing data and rebuild

  itemWrappers.forEach(itemWrapper => {
    const dataIndex = parseInt(itemWrapper.getAttribute("data-index"));
    if (!isNaN(dataIndex)) {
      const subject = itemWrapper.querySelector(`#subject-${dataIndex}`);
      const predicate = itemWrapper.querySelector(".predicate-circle");
      const object = itemWrapper.querySelector(`#object-${dataIndex}`);

      if (subject && predicate && object) {
        modifiedAnnotationData.data.push({
          "subject": subject.textContent,
          "predicate": predicate.textContent,
          "object": object.textContent,
          "dataIndex": dataIndex
        });
      } else {
        console.error("Failed to update modifiedAnnotationData for itemWrapper", itemWrapper);
      }
    } else {
      console.error("Invalid data-index for itemWrapper", itemWrapper);
    }
  });

  console.log(modifiedAnnotationData); // Log the modified object after updating.
  window.opener.postMessage(modifiedAnnotationData, "*");  // send the data to the popup again whne it is ready
}

// Function to attach event listeners to draggable items
function attachEventListeners(item) {
  item.addEventListener("dragover", function(event) {
    event.preventDefault();
  });

  item.addEventListener("dragstart", function(event) {
    const draggedItemId = event.target.id;
    event.dataTransfer.setData("text/plain", draggedItemId);
    event.target.classList.add("dragging");
  });

  item.addEventListener("drop", function(event) {
    event.preventDefault();
    const draggedItemId = event.dataTransfer.getData("text/plain");
    const draggedItem = document.getElementById(draggedItemId);
    const targetItem = event.target.closest('.draggable-item');
    if (draggedItem && targetItem && draggedItem !== targetItem) {
      const draggedIndex = parseInt(draggedItem.getAttribute("data-index"));
      const targetIndex = parseInt(targetItem.getAttribute("data-index"));

      const draggedSubject = document.getElementById(`subject-${draggedIndex}`);
      const targetSubject = document.getElementById(`subject-${targetIndex}`);
      const draggedObject = document.getElementById(`object-${draggedIndex}`);
      const targetObject = document.getElementById(`object-${targetIndex}`);

      if (draggedSubject && targetSubject && draggedObject && targetObject) {
        // Swap content
        [draggedSubject.textContent, targetSubject.textContent] = [targetSubject.textContent, draggedSubject.textContent];
        [draggedObject.textContent, targetObject.textContent] = [targetObject.textContent, draggedObject.textContent];
      } else {
        console.error("Failed to swap elements during drag-and-drop");
      }
    }
    updateModifiedData();
  });

  item.addEventListener("click", function(event) {
    if (!event.target.classList.contains("editing")) {
      event.target.contentEditable = true;
      event.target.classList.add("editing");
    }
  });

  item.addEventListener("blur", function(event) {
    event.target.contentEditable = false;
    event.target.classList.remove("editing");
    updateModifiedData();
  });
}

function createItem(className, textContent, draggable, id, dataIndex, styles) {
  const item = document.createElement("div");
  item.classList.add(className);
  item.textContent = textContent;
  if (draggable) {
    item.draggable = true;
  }
  if (id) {
    item.setAttribute("id", id);
  }
  if (dataIndex !== undefined) {
    item.setAttribute("data-index", dataIndex);
  }
  if (styles) {
    Object.assign(item.style, styles);
  }
  attachEventListeners(item);
  return item;
}

function createArrow() {
  const arrow = document.createElement("div");
  arrow.classList.add("arrow");
  
  const svgArrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgArrow.setAttribute("viewBox", "0 0 10 10");
  
  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrowPath.setAttribute("d", "M1 1 L5 9 L9 1 Z");
  
  svgArrow.appendChild(arrowPath);
  arrow.appendChild(svgArrow);
  
  return arrow;
}

function createDeleteIcon(itemWrapper, dataIndex) {
  const deleteIcon = document.createElement("i");
  deleteIcon.classList.add("fas", "fa-trash-alt");
  deleteIcon.setAttribute("aria-label", "Remove Triple");
  deleteIcon.setAttribute("title", "Remove Triple");
  deleteIcon.style.cursor = "pointer"; // Set cursor to pointer for interaction
  
  deleteIcon.addEventListener("click", function() {
    // Remove the triple from the view
    itemWrapper.remove();
    
    // Find and remove the deleted triple from the modified annotationData
    if (typeof modifiedAnnotationData === 'object' && modifiedAnnotationData.data) {
        const indexToDelete = dataIndex;
        console.log(indexToDelete);
        if (indexToDelete !== -1) {
            console.log(modifiedAnnotationData);
            modifiedAnnotationData.data.splice(indexToDelete, 1);
            console.log(modifiedAnnotationData.data); // Output the modified annotationData for demonstration
            // Update the modified annotation data after delete
            updateModifiedData();
        }
    } else {
        const indexToDelete = dataIndex;
        if (indexToDelete !== -1) {
            annotationData.data.splice(indexToDelete, 1);
            console.log(annotationData.data); // Output the modified annotationData for demonstration
            // Update the modified annotation data after delete
            updateModifiedData();
        }
    }
  });

  return deleteIcon;
}

// Create a container for the spinner
const spinnerContainer = document.createElement("div");
spinnerContainer.classList.add("spinner-container");

// Create the spinner
const spinner = document.createElement("div");
spinner.classList.add("spinner");

// Append the spinner to the container
spinnerContainer.appendChild(spinner);

// Append the container to the imageAnnotationContainer
imageAnnotationContainer.appendChild(spinnerContainer);

// Render the triples view
function renderTriplesView(annotationData) {
  console.log(annotationData, annotationData.data);
  if (annotationData && annotationData.data) {
    console.log(annotationData);
    spinner.style.display = "none"; // hide the spinner
    
    // Modified annotation data starts as a deep copy of the original
    modifiedAnnotationData = deepCopy(annotationData);
    console.log(modifiedAnnotationData);

    modifiedAnnotationData.data.forEach((dataItem, itemIndex) => {
      const itemWrapper = document.createElement("div");
      itemWrapper.classList.add("item-wrapper");
      itemWrapper.setAttribute("data-index", itemIndex); // Set the data-index attribute
  
      const subjectDiv = createItem("draggable-item", dataItem.subject, true, `subject-${itemIndex}`);
      itemWrapper.appendChild(subjectDiv);
  
      const predicateDiv = createItem("predicate-circle", dataItem.predicate);
      itemWrapper.appendChild(predicateDiv);
      
  
      const objectDiv = createItem("draggable-item", dataItem.object, true, `object-${itemIndex}`, itemIndex, { marginLeft: "320px" });
      itemWrapper.appendChild(objectDiv);
  
      const arrow = createArrow();
      itemWrapper.appendChild(arrow);
  
      imageAnnotationContainer.appendChild(itemWrapper);
  
      // Create the Font Awesome icon element for deleting a triple
      console.log(modifiedAnnotationData);
      const deleteIcon = createDeleteIcon(itemWrapper, itemIndex);
      itemWrapper.appendChild(deleteIcon);
  
      imageAnnotationContainer.appendChild(itemWrapper);
  
      const seperator = document.createElement("hr");
      seperator.setAttribute("id", "seperator");
      imageAnnotationContainer.appendChild(seperator);
    });
    // Attach event listeners to all draggable items after rendering
    attachEventListenersToDraggableItems();
  }
}

// Create a new triple
document.getElementById("new-triple").addEventListener("click", function() {
  // Create a new triple element
  const newItemIndex = annotationData.data.length;
  const newItemWrapper = document.createElement("div");
  newItemWrapper.classList.add("item-wrapper");
  newItemWrapper.setAttribute("data-index", newItemIndex);

  // Update the original data with a new empty triple
  annotationData.data.push({
    "subject": "New Subject",
    "predicate": "New Predicate",
    "object": "New Object"
  });

  // Create draggable subject div
  const newSubjectDiv = createItem("draggable-item", "New Subject", true, `subject-${newItemIndex}`);
  newItemWrapper.appendChild(newSubjectDiv);

  // Create predicate circle
  const newPredicate = createItem("predicate-circle", "New Predicate");
  newItemWrapper.appendChild(newPredicate);

  // Create draggable object div
  const newObjectDiv = createItem("draggable-item", "New Object", true, `object-${newItemIndex}`, newItemIndex, { marginLeft: "320px" });
  newItemWrapper.appendChild(newObjectDiv);

  const arrow = createArrow();
  newItemWrapper.appendChild(arrow);

  // Create delete icon
  const deleteIcon = createDeleteIcon(newItemWrapper, newItemIndex);
  newItemWrapper.appendChild(deleteIcon);

  // Append the new triple element to the container
  imageAnnotationContainer.appendChild(newItemWrapper);
  updateModifiedData();
});

// Call this function to attach event listeners to all draggable items after rendering
function attachEventListenersToDraggableItems() {
  const draggableItems = document.querySelectorAll(".draggable-item");
  draggableItems.forEach(item => {
    attachEventListeners(item);
  });
}