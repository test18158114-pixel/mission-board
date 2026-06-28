const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out');
const oldPath = path.join(outDir, '_next');
const newPath = path.join(outDir, 'next');

console.log('🔄 Running InfinityFree path rewriter...');

if (fs.existsSync(oldPath)) {
  fs.renameSync(oldPath, newPath);
  console.log('   ✓ Renamed _next folder to next successfully.');
  
  // Recursively update paths in HTML, CSS, and JS files
  replaceInFiles(outDir);
  console.log('🎉 Rewrite completed! The static build is ready for InfinityFree.');
} else {
  console.log('   ⚠ No _next folder found. Build might have failed.');
}

function replaceInFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      replaceInFiles(filePath);
    } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('_next')) {
        // Replace all instances of _next with next
        content = content.replace(/_next/g, 'next');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`   ✓ Updated paths in: ${path.relative(outDir, filePath)}`);
      }
    }
  });
}
