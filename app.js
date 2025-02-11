let currentStream = null;

// tries to find out if there is a back camera to be used if not default to the front camera
async function startCameraWithPreferredConstraints() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    const backCamera = videoDevices.find(device => /back|environment|rear/i.test(device.label));
    const constraints = backCamera 
      ? {
          video: {
            deviceId: { exact: backCamera.deviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        }
      : {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error('Error accessing the camera with preferred constraints:', error);
    throw error;
  }
}

// Function to fetch Book Info with the isbn via API
async function fetchBookDetails(isbn) {
  try {
    // Use the Open Library API to fetch book details using the ISBN
    const response = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!response.ok) {
      throw new Error(`Book not found (status: ${response.status})`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching book details:', error);
    return null;
  }
}

// Function to display the fetched Book Information on the page
function displayBookInfo(bookData) {
  const infoDiv = document.getElementById('book-info');
  if (!bookData) {
    infoDiv.textContent = 'No book details found.';
    return;
  }
  // For example, display title, authors, and description if available
  let authors = 'Unknown';
  if (bookData.authors && Array.isArray(bookData.authors)) {
    // Open Library returns authors as objects with "key" properties.
    // You might need an extra call to fetch the author name; for simplicity, we'll show the key.
    authors = bookData.authors.map(author => author.key).join(', ');
  }
  infoDiv.innerHTML = `
    <h2>${bookData.title || 'Untitled'}</h2>
    <p><strong>Author(s):</strong> ${authors}</p>
    <p><strong>Description:</strong> ${bookData.description ? (typeof bookData.description === 'string' ? bookData.description : bookData.description.value) : 'No description available.'}</p>
  `;
}

document.getElementById('start-barcode-scanner').addEventListener('click', async () => {
  const videoElement = document.getElementById('video');

  try {
    // Request access to the preferred camera (back on mobile if available, default on laptop)
    const stream = await startCameraWithPreferredConstraints();
    videoElement.srcObject = stream;
    currentStream = stream;

    // Initialize QuaggaJS
    Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: videoElement, // Using the existing video element
        constraints: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      },
      decoder: {
        readers: [
          "ean_reader",       // EAN-13
          "upc_reader",       // UPC-A
          "code_128_reader",  // Code 128
          "code_39_reader",   // Code 39
          "i2of5_reader"      // Additional format
        ]
      },
      locate: true,
      locator: {
        patchSize: 'x-small',
        halfSample: true
      }
    }, (err) => {
      if (err) {
        console.error('QuaggaJS initialization error:', err);
        return;
      }
      Quagga.start();
    });

    // Set up detection event handler
    Quagga.onDetected(async (result) => {
      const isbn = result.codeResult.code;
      document.getElementById('result').textContent = `Barcode detected: ${isbn}`;
      console.log(`Barcode detected: ${isbn}`);
      // Stop scanning on detection
      Quagga.stop();
      stopVideoStream();

      // Fetch and display book details using the scanned ISBN
      const bookData = await fetchBookDetails(isbn);
      displayBookInfo(bookData);
    });

  } catch (error) {
    console.log('Error starting barcode scanner:', error);
  }
});

// Stop Scanning Button
document.getElementById('stop-barcode-scanner').addEventListener('click', () => {
  Quagga.stop(); // Stop QuaggaJS
  stopVideoStream(); // Stop the video stream
});

// Function to stop the video either if the button is clicked or a code is scanned successfully
function stopVideoStream() {
  const videoElement = document.getElementById('video');
  if (currentStream) {
    const tracks = currentStream.getTracks();
    tracks.forEach(track => track.stop());
    videoElement.srcObject = null;
    currentStream = null;
  } else {
    console.log('No active stream to stop.');
  }
}

// Function to initiate the query of book database via button klick
document.getElementById('submit-isbn').addEventListener('click', async () => {
    const isbn = document.getElementById('isbn-input').value.trim();
    if (!isbn){
        alert('Bitte gib eine ISBN ein!');
        return;
    }

    const bookData = await fetchBookDetails(isbn);
    displayBookInfo(bookData);
});
