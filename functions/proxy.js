// Filename: functions/proxy.js

// This Worker function acts as the server-side proxy
// It must be deployed to handle requests to /proxy?target=...

export async function onRequest(context) {
    // Extract the target URL from the query parameters
    const url = new URL(context.request.url);
    const target = url.searchParams.get("target");

    if (!target) {
        return new Response("Error: 'target' parameter is missing.", { status: 400 });
    }

    try {
        // Perform the network request from the server (Worker)
        // This is the crucial step that bypasses client-side CORS restrictions
        const response = await fetch(target, {
            // Forward headers if necessary, but keep it simple for a basic proxy
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36'
            },
            method: context.request.method,
            body: context.request.body,
        });

        // Create a new response object and copy necessary headers
        // Crucially, we add CORS headers here to allow the client-side HTML/JS to read the result
        const newResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: {
                // Ensure the client can read the response
                'Access-Control-Allow-Origin': '*', 
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                // Copy the Content-Type header to ensure the browser interprets the data correctly
                'Content-Type': response.headers.get('Content-Type') || 'text/html',
                // Remove headers that might cause issues (like content-encoding, which the Worker handles)
                'Content-Encoding': null,
                'Transfer-Encoding': null,
            }
        });

        return newResponse;
    } catch (e) {
        return new Response(`Proxy Execution Failure: ${e.message}`, { status: 500 });
    }
}