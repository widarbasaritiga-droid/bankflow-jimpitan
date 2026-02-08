const fs = require('fs');
const path = require('path');

// Increment version
function incrementVersion(currentVersion) {
    const parts = currentVersion.split('.');
    parts[2] = parseInt(parts[2]) + 1; // Increment patch version
    return parts.join('.');
}

// Update version in files
function updateVersion(newVersion) {
    const buildDate = new Date().toISOString();
    
    // Update version.json
    const versionJson = {
        version: newVersion,
        build_date: buildDate,
        changelog: [
            "Auto-update cache system",
            "Performance improvements",
            "Bug fixes"
        ]
    };
    
    fs.writeFileSync('version.json', JSON.stringify(versionJson, null, 2));
    
    // Update sw.js (CACHE_VERSION dan APP_VERSION)
    let swContent = fs.readFileSync('sw.js', 'utf8');
    swContent = swContent.replace(
        /const CACHE_VERSION = 'jimpitan-v[\d\.]+'/,
        `const CACHE_VERSION = 'jimpitan-v${newVersion}'`
    );
    swContent = swContent.replace(
        /const APP_VERSION = '[\d\.]+'/,
        `const APP_VERSION = '${newVersion}'`
    );
    fs.writeFileSync('sw.js', swContent);
    
    // Update index.html (currentVersion)
    let htmlContent = fs.readFileSync('index.html', 'utf8');
    htmlContent = htmlContent.replace(
        /const currentVersion = '[\d\.]+'/,
        `const currentVersion = '${newVersion}'`
    );
    fs.writeFileSync('index.html', htmlContent);
    
    // Add cache busting to CSS/JS references
    htmlContent = htmlContent.replace(
        /(href|src)="([^"]+\.(css|js))"/g,
        `$1="$2?v=${newVersion}"`
    );
    fs.writeFileSync('index.html', htmlContent);
    
    console.log(`✅ Version updated to ${newVersion}`);
    console.log(`📅 Build date: ${buildDate}`);
}

// Main build process
function build() {
    // Read current version
    const versionJson = JSON.parse(fs.readFileSync('version.json', 'utf8'));
    const currentVersion = versionJson.version;
    const newVersion = incrementVersion(currentVersion);
    
    // Update all files
    updateVersion(newVersion);
    
    // Create build info
    const buildInfo = {
        version: newVersion,
        timestamp: new Date().toISOString(),
        files: [
            'index.html',
            'styles.css',
            'shimmer-effects.css',
            'sw.js',
            'version.json'
        ]
    };
    
    fs.writeFileSync('build-info.json', JSON.stringify(buildInfo, null, 2));
    
    console.log('🎉 Build completed successfully!');
    console.log('📋 Next steps:');
    console.log('1. Deploy all files to server');
    console.log('2. Users will auto-update on next visit');
}

// Run build
build();
