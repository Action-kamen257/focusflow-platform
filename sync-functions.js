const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'server');
const destDir = path.join(__dirname, 'functions', 'server');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log('🔄 Syncing server code into functions/server...');
copyRecursiveSync(srcDir, destDir);
console.log('✅ Server code synced into functions/server successfully!');
