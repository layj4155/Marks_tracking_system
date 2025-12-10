const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/js/app.js');
let content = fs.readFileSync(filePath, 'utf8');

// Remove API_BASE_URL constant
content = content.replace(/const API_BASE_URL = '[^']+';[\n\r]*/g, '');

// Revert all fetch calls back to relative paths
content = content.replace(/fetch\(`\$\{API_BASE_URL\}\/api\//g, "fetch(`/api/");

fs.writeFileSync(filePath, content, 'utf8');
console.log('API URLs reverted to relative paths');
