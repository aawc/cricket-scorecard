import fs from 'fs';
import path from 'path';

const distDir = './dist';
const swFile = path.join(distDir, 'sw.js');

function getFilesRecursively(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(fullPath));
        } else {
            const relative = path.relative(distDir, fullPath);
            if (relative !== 'sw.js' && !relative.startsWith('.')) {
                // Use relative path with forward slashes
                results.push(relative.replace(/\\/g, '/'));
            }
        }
    });
    return results;
}

if (fs.existsSync(swFile)) {
    const assets = [
        './',
        'index.html',
        ...getFilesRecursively(distDir)
    ];
    // Remove duplicates if any
    const uniqueAssets = Array.from(new Set(assets));
    
    let swContent = fs.readFileSync(swFile, 'utf8');
    
    const assetsString = JSON.stringify(uniqueAssets, null, 4);
    swContent = swContent.replace(
        /const ASSETS = \[[^]*?\];/g,
        `const ASSETS = ${assetsString};`
    );
    
    fs.writeFileSync(swFile, swContent);
    console.log(`Successfully injected ${uniqueAssets.length} assets into dist/sw.js`);
} else {
    console.error("dist/sw.js not found!");
}
