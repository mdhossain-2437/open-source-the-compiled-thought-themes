const fs = require("fs");
const path = require("path");
const SVGO = require("svgo");

const svgo = new SVGO({
  plugins: [
    { removeViewBox: false },
    { removeDimensions: true },
    { cleanupAttrs: true },
    { removeTitle: true },
    { removeDesc: true },
    { removeUselessDefs: true },
    { removeEditorsNSData: true },
    { removeEmptyAttrs: true },
    { removeHiddenElems: true },
    { removeEmptyText: true },
    { removeEmptyContainers: true },
    { cleanupEnableBackground: true },
    { minifyStyles: true },
    { convertColors: true },
    { convertPathData: true },
    { convertTransform: true },
    { removeUnknownsAndDefaults: true },
    { removeNonInheritableGroupAttrs: true },
    { removeUselessStrokeAndFill: true },
    { removeUnusedNS: true },
    { prefixIds: true },
  ],
});

async function optimizeIcons(directory) {
  const files = fs.readdirSync(directory);

  for (const file of files) {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      await optimizeIcons(filePath);
    } else if (file.endsWith(".svg")) {
      console.log(`🔄 Optimizing: ${filePath}`);
      try {
        const svg = fs.readFileSync(filePath, "utf8");
        const result = await svgo.optimize(svg);
        fs.writeFileSync(filePath, result.data);
        console.log(`✨ Optimized: ${filePath}`);
      } catch (error) {
        console.error(`❌ Error optimizing ${filePath}:`, error);
      }
    }
  }
}

// Start optimization
console.log("🚀 Starting icon optimization...");
const iconDirs = [
  "./icons/material",
  "./icons/feather",
  "./icons/octicons",
  "./icons/fontawesome",
  "./icons/custom",
];

(async () => {
  for (const dir of iconDirs) {
    if (fs.existsSync(dir)) {
      console.log(`📂 Processing directory: ${dir}`);
      await optimizeIcons(dir);
    }
  }
  console.log("✅ Icon optimization completed successfully!");
})();
