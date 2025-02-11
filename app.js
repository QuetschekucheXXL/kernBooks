let currentStream = null;

async function startCameraWithBack() {
  try {
    // Enumerate all video input devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');

    // Attempt to select a device with a label that indicates it's the back camera.
    // The label may contain "back", "environment", or "rear".
    const backCamera = videoDevices.find(device => /back|environment|rear/i.test(device.label));
    
    // If a back camera is found, use its deviceId; otherwise, fallback to default.
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
            facingMode: { exact: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Error accessing the camera with back constraints:', error);
    throw error;
  }
}

document.getElementById('start-barcode-scanner').addEventListener('click', async () => {
  const videoElement = document.getElementById('video');
  
  try {
    // Request access to the back camera using our helper function
    const stream = await startCameraWithBack();
    videoElement.srcObject = stream;
    currentStream = stream;

    // Initialize QuaggaJS with the video element as the target
    Quagga.init({
      inputStream: {
        name: 'Live',
        type: 'LiveStream',
        target: videoElement, // Use the existing video element
        constraints: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // Note: We're not using facingMode here because we've already selected the device by deviceId.
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
        patchSize: 'x-small', // Helps with detection of smaller barcodes
        halfSample: true
      }
    }, (err) => {
      if (err) {
        console.error('QuaggaJS initialization error:', err);
        return;
      }
      Quagga.start();
    });

    // Set up the detection event handler
    Quagga.onDetected((result) => {
      const code = result.codeResult.code;
      document.getElementById('result').textContent = `Barcode detected: ${code}`;
      console.log(`Barcode detected: ${code}`);
      // Stop scanning on first detection
      Quagga.stop();
      stopVideoStream();
    });

  } catch (error) {
    console.log('Error accessing the camera:', error);
  }
});

document.getElementById('stop-barcode-scanner').addEventListener('click', () => {
  Quagga.stop(); // Stop QuaggaJS
  stopVideoStream(); // Stop the video stream
});

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
