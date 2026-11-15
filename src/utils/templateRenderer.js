const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '../../views');
const compiledPageCache = new Map();
const fileContentCache = new Map();

function readTemplateFile(fileName) {
  if (fileContentCache.has(fileName)) {
    return fileContentCache.get(fileName);
  }
  const filePath = path.join(viewsDir, fileName);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  fileContentCache.set(fileName, content);
  return content;
}

function renderTemplate(templateName, seen = new Set()) {
  let fileName = templateName;
  if (!fileName.endsWith('.html')) fileName += '.html';

  if (seen.has(fileName)) {
    return `<!-- Circular include detected: ${fileName} -->`;
  }
  seen.add(fileName);

  const content = readTemplateFile(fileName);
  if (content === null) {
    return `<!-- Template file not found: ${fileName} -->`;
  }

  // Match <?!= include('FileName') ?> or <?!= include('FileName'); ?>
  const includeRegex = /<\?!=\s*include\s*\(\s*['"]([^'"]+)['"]\s*\)\s*;?\s*\?>/g;

  return content.replace(includeRegex, (match, includedFile) => {
    return renderTemplate(includedFile, new Set(seen));
  });
}

function getCompiledPage(pageName) {
  if (compiledPageCache.has(pageName)) {
    return compiledPageCache.get(pageName);
  }

  let html = renderTemplate(pageName);
  const bridgeScript = '<script src="/js/gas-bridge.js"></script>';
  if (html.includes('<head>')) {
    html = html.replace('<head>', '<head>\n  ' + bridgeScript);
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', '  ' + bridgeScript + '\n</head>');
  } else {
    html = bridgeScript + '\n' + html;
  }

  compiledPageCache.set(pageName, html);
  return html;
}

function clearCache() {
  compiledPageCache.clear();
  fileContentCache.clear();
}

module.exports = { renderTemplate, getCompiledPage, clearCache };
