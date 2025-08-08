const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Ensure all icon dependencies are installed
console.log("🔄 Syncing icon dependencies...");
execSync("npm install");

// Create icon directories if they don't exist
const iconDirs = [
  "./icons/material",
  "./icons/feather",
  "./icons/octicons",
  "./icons/fontawesome",
  "./icons/custom",
];

iconDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Copy Material Design Icons
console.log("📦 Copying Material Design Icons...");
const materialSrcDir =
  "./node_modules/material-design-icons-iconfont/dist/material-design-icons";
const materialDestDir = "./icons/material";
if (fs.existsSync(materialSrcDir)) {
  fs.cpSync(materialSrcDir, materialDestDir, { recursive: true });
}

// Copy Feather Icons
console.log("📦 Copying Feather Icons...");
const featherSrcDir = "./node_modules/feather-icons/dist";
const featherDestDir = "./icons/feather";
if (fs.existsSync(featherSrcDir)) {
  fs.cpSync(featherSrcDir, featherDestDir, { recursive: true });
}

// Copy Octicons
console.log("📦 Copying GitHub Octicons...");
const octiconsSrcDir = "./node_modules/@primer/octicons/build";
const octiconsDestDir = "./icons/octicons";
if (fs.existsSync(octiconsSrcDir)) {
  fs.cpSync(octiconsSrcDir, octiconsDestDir, { recursive: true });
}

// Copy FontAwesome Icons
console.log("📦 Copying FontAwesome Icons...");
const faSrcDir = "./node_modules/@fortawesome/fontawesome-free/svgs";
const faDestDir = "./icons/fontawesome";
if (fs.existsSync(faSrcDir)) {
  fs.cpSync(faSrcDir, faDestDir, { recursive: true });
}

console.log("✨ Icon sync completed successfully!");
