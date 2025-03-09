const fs = require('fs');
const path = require('path');

// Function to recursively find all route.js files in the app/api directory
function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList);
    } else if (file === 'route.js' || file === 'route.ts') {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Function to add the dynamic export if it doesn't exist
function addDynamicExport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if the dynamic export already exists
  if (!content.includes('export const dynamic')) {
    // Find the first export or import statement
    const importRegex = /^import .+$/m;
    const lastImportMatch = content.match(new RegExp(importRegex, 'g'));
    
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const lastImportIndex = content.lastIndexOf(lastImport) + lastImport.length;
      
      // Insert the dynamic export after the last import with a blank line
      const updatedContent = 
        content.slice(0, lastImportIndex) + 
        '\n\nexport const dynamic = \'force-dynamic\';\n' + 
        content.slice(lastImportIndex);
      
      fs.writeFileSync(filePath, updatedContent);
      console.log(`Added dynamic export after imports in ${filePath}`);
    } else {
      // No import statements found, add at the beginning of the file
      const updatedContent = 'export const dynamic = \'force-dynamic\';\n\n' + content;
      fs.writeFileSync(filePath, updatedContent);
      console.log(`Added dynamic export at the beginning of ${filePath}`);
    }
  } else {
    console.log(`Dynamic export already exists in ${filePath}`);
  }
}

// Main function
function main() {
  const apiDir = path.join(__dirname, 'app', 'api');
  const routeFiles = findRouteFiles(apiDir);
  
  console.log(`Found ${routeFiles.length} route files`);
  
  routeFiles.forEach(filePath => {
    addDynamicExport(filePath);
  });
  
  console.log('Done!');
}

main(); 