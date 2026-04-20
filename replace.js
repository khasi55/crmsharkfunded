const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === '.next') return;
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(__dirname + '/backend').concat(walk(__dirname + '/frontend'));

let changed = 0;
for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    content = content.replace(/STOX PIPS LIMITED/g, 'BULGE GROUP INVESTMENT LIMITED');
    content = content.replace(/Stox Pips Limited/g, 'Bulge Group Investment Limited');
    if (content !== original) {
        fs.writeFileSync(file, content);
        changed++;
        console.log('Updated', file.replace(__dirname, ''));
    }
}
console.log('Total changed:', changed);
