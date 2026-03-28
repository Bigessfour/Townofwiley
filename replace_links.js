const fs = require('fs');
let html = fs.readFileSync('src/app/app.html', 'utf-8');

html = html.replace(/\[routerLink\]="([^"]+)\.path"/g, '[href]="\'https://www.townofwiley.gov\' + $1.path"');
html = html.replace(/\[fragment\]="([^"]+)\.fragment"/g, '');

fs.writeFileSync('src/app/app.html', html);
console.log('Done!');
