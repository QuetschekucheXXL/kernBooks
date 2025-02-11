let currentStream = null;

document.getElementById('start-barcode-scanner').addEventListener('click', async () => {
    const videoElement = document.getElementById('video');

    try {
        // request access to the camera
        const stream = await navigator.mediaDevices.getUserMedia({video: true});
        // set the video element's source to the stream
        videoElement.srcObject = stream;
        // store the stream for later use --> in order to close it with the second button
        currentStream = stream;

        // initialize QuaggaJS
        Quagga.init({
            inputStream: {
                name: 'Live',
                type: 'LiveStream',
                target: videoElement, // Using the existing Video-Element
                constraints: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: { exact: 'environment' } // Using the back camera
                },
            },
            decode: {
                readers: [
                    "ean_reader",       // EAN-13
                    "upc_reader",       // UPC-A
                    "code_128_reader",  // Code 128
                    "code_39_reader",    // Code 39
                    "i2of5_reader"
                ]
            },
            locate: true,
            // setting locator to small or x-small should apparently help with the detection of EAN-13 codes
            locator: {
                patchSize: 'x-small', // Options: 'x-small', 'small', 'medium', 'large', 'x-large'
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
            // Stop QuaggaJS after a successful detection
            Quagga.stop();
            // Stop the video stream
            stopVideoStream();
        });

    } catch (error) {
        console.log('Error accessing the camera:', error);
    }
});

document.getElementById('stop-barcode-scanner').addEventListener('click', () => {
    Quagga.stop(); // --> stop QuaggaJS
    stopVideoStream(); // --> stop the video stream
});

function stopVideoStream() {
    const videoElement = document.getElementById('video');
    // try to end the video stream if button is clicked
    if (currentStream) {
        // Get all tracks of the stream
        const tracks = currentStream.getTracks();
        // Stop each track
        tracks.forEach(track => track.stop());
        // Clear the video element's source
        document.getElementById('video').srcObject = null;
        // Clear the stored stream
        currentStream = null;   
    } else {
        console.log('Es läuft gerade kein Scan, der beendet werden könnte.');
    }
}
