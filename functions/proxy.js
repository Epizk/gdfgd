// Helper function to rewrite relative attributes (href, src, action)
function rewriteAttribute(element, attr, originalUrl, proxyWorkerBaseUrl) {
    const value = element.getAttribute(attr);
    if (value) {
        // Only rewrite if it's a relative path or starts with a protocol we want to fix
        if (!value.startsWith('http') && !value.startsWith('//') && !value.startsWith('mailto:')) {
            try {
                // 1. Resolve the relative path to an absolute path on the original site
                const absoluteUrl = new URL(value, originalUrl).toString();
                
                // 2. Wrap the absolute URL in the proxy's target parameter
                const proxiedUrl = `${proxyWorkerBaseUrl}?target=${encodeURIComponent(absoluteUrl)}`;
                
                element.setAttribute(attr, proxiedUrl);
            } catch (e) {
                // Ignore paths that can't be resolved (e.g., mailto:, javascript:)
            }
        }
    }
}

export default {
    async fetch(request, env, ctx) {
        // 1. Extract the target URL from the query parameters
        const url = new URL(request.url);
        const target = url.searchParams.get("target");

        if (!target) {
            return new Response("<html><body style='font-family: Inter; text-align: center; padding: 20px; color: #ef4444;'><h1>Error 400: Target Missing</h1><p>The URL is missing the required 'target' parameter.</p></body></html>", { 
                status: 400,
                headers: { 'Content-Type': 'text/html' }
            });
        }

        // Base URL for the proxy worker (used for rewriting links)
        const proxyWorkerBaseUrl = url.origin + url.pathname.split('?')[0];

        try {
            // 2. Perform the network request from the server
            const response = await fetch(target, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36',
                },
                method: request.method,
                body: request.body,
            });

            // 3. Prepare response headers
            const headers = new Headers(response.headers);
            headers.set('Access-Control-Allow-Origin', '*');
            // CRITICAL FIX: Remove headers that break compressed content (images, CSS)
            headers.delete('Content-Encoding'); 
            headers.delete('Transfer-Encoding');
            headers.delete('Content-Length'); 

            const contentType = headers.get('Content-Type') || '';

            if (contentType.includes('text/html')) {
                const originalUrl = new URL(target);
                
                // 4. Use HTMLRewriter for link/resource fixing (Crucial for sites, images, CSS, search)
                const rewriter = new HTMLRewriter()
                    .on('a', { // Anchor links
                        element: (element) => rewriteAttribute(element, 'href', originalUrl, proxyWorkerBaseUrl)
                    })
                    .on('img', { // Images
                        element: (element) => rewriteAttribute(element, 'src', originalUrl, proxyWorkerBaseUrl)
                    })
                    .on('link[rel="stylesheet"]', { // CSS links
                        element: (element) => rewriteAttribute(element, 'href', originalUrl, proxyWorkerBaseUrl)
                    })
                    .on('script', { // External Scripts
                        element: (element) => rewriteAttribute(element, 'src', originalUrl, proxyWorkerBaseUrl)
                    })
                    .on('form', { // Search and submission forms
                        element: (element) => {
                            const action = element.getAttribute('action') || originalUrl.toString();
                            // Resolve the form action and wrap it with the proxy URL
                            const absoluteAction = new URL(action, originalUrl).toString();
                            const proxiedAction = `${proxyWorkerBaseUrl}?target=${encodeURIComponent(absoluteAction)}`;
                            element.setAttribute('action', proxiedAction);
                        }
                    });
                
                // 5. Return the transformed HTML stream with the new headers
                return rewriter.transform(response, { headers: headers, status: response.status, statusText: response.statusText });

            } else {
                // 5. Return non-HTML content (images, JSON, etc.) directly with cleaned headers
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: headers,
                });
            }
        } catch (e) {
            return new Response(`<html><body style='font-family: Inter; text-align: center; padding: 20px; color: #ef4444;'><h1>Proxy Error 500</h1><p>Could not connect to target URL: ${e.message}</p></body></html>`, { 
                status: 500,
                headers: { 'Content-Type': 'text/html' }
            });
        }
    },
};
