const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public/js/app.js');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the syntax errors from previous replacements
content = content.replace(/fetch\(`\$\{API_BASE_URL\}\/api\/([^']*)',/g, "fetch(`${API_BASE_URL}/api/$1`,");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Syntax errors fixed');
