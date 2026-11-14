const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '../../views');

function renderTemplate(templateName, seen = new Set()) {
  let fileName = templateName;
  if (!fileName.endsWith('.html')) fileName += '.html';
  const filePath = path.join(viewsDir, fileName);

  if (!fs.existsSync(filePath)) {
    return `<!-- Template file not found: ${fileName} -->`;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Match <?!= include('FileName') ?> or <?!= include('FileName'); ?>
  const includeRegex = /<\?!=\s*include\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*\?>/g;

  content = content.replace(includeRegex, (match, includedFile) => {
    return renderTemplate(includedFile, seen);
  });

  return content;
}

function getCompiledPage(pageName) {
  let html = renderTemplate(pageName);
  const bridgeScript = '<script src="/js/gas-bridge.js"></script>';
  if (html.includes('<head>')) {
    html = html.replace('<head>', '<head>\n  ' + bridgeScript);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', '  ' + bridgeScript + '\n</head>');
  } else {
    html = bridgeScript + '\n' + html;
  }
  return html;
}

module.exports = { renderTemplate, getCompiledPage };
