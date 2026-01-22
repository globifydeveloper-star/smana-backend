import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_DIR = path.join(__dirname, '../src/routes');
const OUTPUT_FILE = path.join(__dirname, '../smana_backend.postman_collection.json');

const routeFiles = {
    '/api/auth': 'authRoutes.ts',
    '/api/rooms': 'roomRoutes.ts',
    '/api/menu': 'menuRoutes.ts',
    '/api/orders': 'orderRoutes.ts',
    '/api/service-requests': 'serviceRoutes.ts',
    '/api/guests': 'guestRoutes.ts',
    '/api/upload': 'uploadRoutes.ts',
    '/api/staff': 'staffRoutes.ts',
    '/api/payments': 'paymentRoutes.ts',
    '/api/feedbacks': 'feedbackRoutes.ts'
};

const collection = {
    info: {
        name: "Smana Backend API",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    },
    item: []
};

// Simple regex to find routes
// Supports:
// router.get('/path', ...)
// router.post('/path', ...)
// router.route('/path').get(...)
const methodRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]*)['"`]/g;
const routeRegex = /router\.route\s*\(\s*['"`]([^'"`]*)['"`]\s*\)/g;
const chainedMethodRegex = /\.(get|post|put|delete|patch)\s*\(/g;

function parseFile(prefix, filename) {
    const filePath = path.join(ROUTES_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return [];
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const items = [];

    // Strategy 1: router.METHOD(path, ...)
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
        const [_, method, routePath] = match;
        const fullPath = (prefix + routePath).replace('//', '/');
        items.push(createItem(method, fullPath, filename));
    }

    // Strategy 2: router.route(path).METHOD(...)
    let routeMatch;
    while ((routeMatch = routeRegex.exec(content)) !== null) {
        const [fullMatch, routePath] = routeMatch;
        const fullPath = (prefix + routePath).replace('//', '/');

        // Look ahead for chained methods
        const checkIndex = routeMatch.index + fullMatch.length;
        const restOfFile = content.slice(checkIndex);

        // Simple scan for chained methods until we hit a semicolon or new router.route/method
        // This is a naive parser but should work for standard Express code
        let chainedMatch;
        // checking the first few chars for .method
        const possibleMethods = ['get', 'post', 'put', 'delete', 'patch'];

        // We need to iterate through the rest of the string to find chained calls
        // We'll use a loop and update the position
        let currentPos = 0;
        let chainRegex = /\.(get|post|put|delete|patch)\s*\(/g;

        // We only look reasonably close (next 500 chars) to avoid false positives? 
        // Or just scan until the next statement?
        // Let's just matching regex against the immediate following content

        // Actually, let's just use the global regex on the slice, but be careful
        // The issue is knowing when the chain ends. 
        // Usually ends with ;

        const endOfChain = restOfFile.indexOf(';');
        const chainBlock = restOfFile.substring(0, endOfChain !== -1 ? endOfChain : 500);

        while ((chainedMatch = chainRegex.exec(chainBlock)) !== null) {
            items.push(createItem(chainedMatch[1], fullPath, filename));
        }
    }

    return items;
}

function createItem(method, url, description) {
    const methodUpper = method.toUpperCase();
    return {
        name: `${methodUpper} ${url}`,
        request: {
            method: methodUpper,
            header: [],
            url: {
                raw: `{{base_url}}${url}`,
                host: ["{{base_url}}"],
                path: url.split('/').filter(x => x)
            },
            description: `From ${description}`
        },
        response: []
    };
}

for (const [prefix, file] of Object.entries(routeFiles)) {
    const items = parseFile(prefix, file);
    if (items.length > 0) {
        collection.item.push({
            name: prefix,
            item: items
        });
    }
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(collection, null, 2));
console.log(`Generated Postman collection at ${OUTPUT_FILE}`);
