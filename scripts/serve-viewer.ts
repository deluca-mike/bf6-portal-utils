import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const pagesDir = path.resolve(rootDir, 'pages');
const samplesDir = path.resolve(rootDir, 'tests/pixel-art-samples');

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

function getFilePath(urlPath: string): string | null {
    let cleanPath = urlPath.split('?')[0].split('#')[0];
    if (cleanPath === '/' || cleanPath === '') {
        cleanPath = '/index.html';
    } else if (cleanPath === '/pixel-art-viewer.html') {
        cleanPath = '/pixel-art-studio/index.html';
    } else if (cleanPath === '/qr-preview.html') {
        cleanPath = '/qr-code-studio/index.html';
    }

    // Check in pages directory
    const pageCandidate = path.join(pagesDir, cleanPath);
    if (fs.existsSync(pageCandidate)) {
        if (fs.statSync(pageCandidate).isFile()) {
            return pageCandidate;
        }
        const indexCandidate = path.join(pageCandidate, 'index.html');
        if (fs.existsSync(indexCandidate) && fs.statSync(indexCandidate).isFile()) {
            return indexCandidate;
        }
    }

    // Check in samples directory
    const sampleCandidate = path.join(samplesDir, cleanPath.replace(/^\/samples\//, '/'));
    if (fs.existsSync(sampleCandidate) && fs.statSync(sampleCandidate).isFile()) {
        return sampleCandidate;
    }

    // Check from root
    const rootCandidate = path.join(rootDir, cleanPath);
    if (fs.existsSync(rootCandidate) && fs.statSync(rootCandidate).isFile()) {
        return rootCandidate;
    }

    return null;
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const filePath = getFilePath(req.url || '/');

    if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('500 Internal Server Error');
            return;
        }

        res.writeHead(200, {
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
    });
}

function startServer(port: number): void {
    const server = http.createServer(handleRequest);
    server.setMaxListeners(0);

    server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
            server.close();
            console.log(`Port ${port} is in use, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });

    server.listen(port, () => {
        const landingUrl = `http://localhost:${port}/`;
        const pixelArtUrl = `http://localhost:${port}/pixel-art-studio/`;
        const qrStudioUrl = `http://localhost:${port}/qr-code-studio/`;
        console.log(`\n========================================================`);
        console.log(`  🌐 BF6 Portal Utils - Browser Studios Suite`);
        console.log(`  🏠 Landing Page:    ${landingUrl}`);
        console.log(`  🎨 Pixel Art Studio: ${pixelArtUrl}`);
        console.log(`  📱 QR Code Studio:   ${qrStudioUrl}`);
        console.log(`========================================================\n`);

        const shutdown = () => {
            server.close(() => {
                process.exit(0);
            });
        };

        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
    });
}

startServer(3000);
