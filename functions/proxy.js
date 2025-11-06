<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ig0 Proxy (Monochrome)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        /* Monochrome/Grayscale Aesthetic */
        body { 
            font-family: 'Inter', sans-serif;
            background-color: #f7f7f7; /* Very light gray */
            color: #333;
        }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        /* Style the content frame */
        #contentFrame {
            width: 100%;
            height: calc(100vh - 120px); /* Adjusted for top controls */
            border: 1px solid #ccc;
            background-color: #fff;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: height 0.3s ease;
        }
        /* Custom glow effect for button (monochrome glow) */
        .btn-glow {
            transition: all 0.3s ease;
        }
        .btn-glow:hover {
            box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5); /* Darker gray glow */
        }
        .btn-neutral {
            background-color: #333;
            color: white;
            border: 1px solid #333;
        }
        .btn-neutral:hover {
            background-color: #555;
        }
        .fullscreen-frame {
             height: 100vh !important;
             position: fixed;
             top: 0;
             left: 0;
             z-index: 1000;
             margin: 0;
             padding: 0;
        }
    </style>
</head>
<body class="min-h-screen p-4 md:p-8">

    <!-- Main Application UI -->
    <div id="main-ui" class="fade-in max-w-4xl mx-auto">
        <header class="text-center mb-6">
            <h1 class="text-4xl font-extrabold text-neutral-900 tracking-tight">ig0 Proxx</h1>
            <!-- Description is now blank as requested -->
            <p class="text-neutral-600 mt-2"></p>
        </header>

        <main class="bg-white p-6 md:p-8 rounded-xl shadow-xl space-y-6">
            <div class="space-y-4">
                <label for="urlInput" class="block text-lg font-semibold text-neutral-800">Enter Target URL:</label>
                <input type="url" id="urlInput" placeholder="e.g., https://www.google.com" required
                       class="w-full p-4 border border-neutral-300 rounded-lg focus:ring-neutral-500 focus:border-neutral-500 text-neutral-800 transition duration-150 ease-in-out"
                       onkeydown="if(event.key === 'Enter') startProxy()">
            </div>

            <!-- Action Buttons Row 1 -->
            <div class="flex flex-col md:flex-row gap-4">
                <button onclick="startProxy()" id="proxyButton"
                        class="flex-1 p-4 font-bold rounded-lg shadow-lg focus:outline-none focus:ring-4 focus:ring-neutral-500 focus:ring-opacity-50 btn-glow transition duration-150 btn-neutral">
                    Go! (Load in Frame)
                </button>
                <button onclick="clearFrame()" id="clearButton"
                        class="p-4 bg-neutral-200 text-neutral-700 font-bold rounded-lg hover:bg-neutral-300 focus:outline-none focus:ring-4 focus:ring-neutral-400 focus:ring-opacity-50 transition duration-150">
                    Clear Frame
                </button>
            </div>

            <!-- Action Buttons Row 2 (New) -->
            <div class="flex flex-col md:flex-row gap-4">
                <button onclick="toggleFullscreen()" id="fullscreenButton"
                        class="flex-1 p-3 bg-neutral-500 text-white font-bold rounded-lg hover:bg-neutral-600 transition duration-150">
                    Toggle Fullscreen
                </button>
                 <button onclick="launchInBlank()" id="launchBlankButton"
                        class="flex-1 p-3 bg-neutral-500 text-white font-bold rounded-lg hover:bg-neutral-600 transition duration-150">
                    Launch in about:blank
                </button>
            </div>
            
            <div id="messageBox" class="text-red-600 font-medium text-center hidden p-2 bg-red-100 border border-red-300 rounded-lg"></div>

            <div id="loadingIndicator" class="hidden text-center">
                <svg class="animate-spin h-5 w-5 mr-3 text-neutral-600 inline" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading content...
            </div>
        </main>
    </div>

    <!-- Content Frame Area (where the proxied website loads) -->
    <div id="frame-container" class="mt-8 hidden max-w-4xl mx-auto">
        <iframe id="contentFrame" title="Proxied Content"></iframe>
    </div>

    <script>
        const urlInput = document.getElementById('urlInput');
        const messageBox = document.getElementById('messageBox');
        const loadingIndicator = document.getElementById('loadingIndicator');
        const frameContainer = document.getElementById('frame-container');
        const contentFrame = document.getElementById('contentFrame');
        const mainUi = document.getElementById('main-ui');

        // --- WORKER DEPLOYMENT CHANGE START ---
        // IMPORTANT: Replace this placeholder with the actual URL of your deployed Cloudflare Worker!
        const proxyBaseUrl = 'https://YOUR-WORKER-NAME.workers.dev'; 
        // --- WORKER DEPLOYMENT CHANGE END ---

        // Function to show error messages
        function showMessage(msg, isError = true) {
            messageBox.textContent = msg;
            messageBox.className = isError 
                ? 'text-red-600 font-medium text-center p-2 bg-red-100 border border-red-300 rounded-lg'
                : 'text-green-600 font-medium text-center p-2 bg-green-100 border border-green-300 rounded-lg';
            messageBox.classList.remove('hidden');
        }

        // Function to normalize the URL
        function normalizeUrl(url) {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            return url;
        }

        // Function to start the proxy loading process
        async function startProxy() {
            messageBox.classList.add('hidden');
            let url = urlInput.value.trim();

            if (!url) {
                showMessage("Please enter a URL to proxy.", true);
                return;
            }
            
            if (proxyBaseUrl === 'https://YOUR-WORKER-NAME.workers.dev') {
                 showMessage("Error: The Worker URL is still a placeholder. Please replace 'https://YOUR-WORKER-NAME.workers.dev' in the JavaScript with your actual deployed Worker URL.", true);
                 return;
            }

            url = normalizeUrl(url);

            // Hide the UI elements briefly and show loading
            loadingIndicator.classList.remove('hidden');
            
            // Construct the full URL using the deployed Worker URL
            const proxyUrl = `${proxyBaseUrl}/?target=${encodeURIComponent(url)}`;
            
            contentFrame.src = proxyUrl;
            frameContainer.classList.remove('hidden');

            // Hide loading indicator once frame starts loading 
            setTimeout(() => {
                loadingIndicator.classList.add('hidden');
            }, 1000); 

            showMessage(`Attempting to load proxied URL via Worker: ${url}`, false);
        }

        // Function to clear the frame content
        function clearFrame() {
            contentFrame.src = "about:blank"; // Clears the content
            frameContainer.classList.add('hidden');
            contentFrame.classList.remove('fullscreen-frame');
            mainUi.classList.remove('ui-hidden');
            urlInput.value = '';
            messageBox.classList.add('hidden');
            showMessage("Frame cleared. Ready for a new URL.", false);
        }

        // Function to toggle iframe fullscreen mode
        function toggleFullscreen() {
            if (frameContainer.classList.contains('hidden')) {
                showMessage("Please load a URL before toggling fullscreen.", true);
                return;
            }

            contentFrame.classList.toggle('fullscreen-frame');
            
            if (contentFrame.classList.contains('fullscreen-frame')) {
                mainUi.classList.add('ui-hidden');
                showMessage("Fullscreen mode enabled. Press ESC to exit.", false);
            } else {
                mainUi.classList.remove('ui-hidden');
                showMessage("Fullscreen mode disabled.", false);
            }
        }

        // Function to launch the proxied content via the about:blank trick
        function launchInBlank() {
            let url = urlInput.value.trim();

            if (!url) {
                showMessage("Please enter a URL to launch.", true);
                return;
            }
            
            if (proxyBaseUrl === 'https://YOUR-WORKER-NAME.workers.dev') {
                 showMessage("Error: The Worker URL is still a placeholder. Please replace 'https://YOUR-WORKER-NAME.workers.dev' in the JavaScript with your actual deployed Worker URL.", true);
                 return;
            }

            url = normalizeUrl(url);
            const proxyUrl = `${proxyBaseUrl}/?target=${encodeURIComponent(url)}`;
            
            const newWindow = window.open('about:blank', '_blank');
            if (newWindow) {
                newWindow.document.write(`
                    <!DOCTYPE html>
                    <html style="margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%;">
                    <head><title>Loading Proxy...</title></head>
                    <body style="margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%;">
                        <iframe src="${proxyUrl}" style="width: 100%; height: 100%; border: none; margin: 0; padding: 0;"></iframe>
                    </body>
                    </html>
                `);
                newWindow.document.close();
                showMessage(`Launched in new about:blank window/tab: ${url}`, false);
                clearFrame(); // Clear the current frame after launching new window
            } else {
                showMessage("Could not open new window. Check your browser's pop-up blocker.", true);
            }
        }
    </script>
</body>
</html>
