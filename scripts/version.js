const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const semver = require("semver");

const packageJsonPath = path.join(__dirname, "..", "package.json");
const changelogPath = path.join(__dirname, "..", "CHANGELOG.md");

async function determineVersionBump() {
  try {
    const output = execSync("git diff --name-only HEAD~1").toString();
    const changedFiles = output.split("\n").filter(Boolean);

    // Analyze changes to determine version bump type
    let type = "patch";
    const changes = new Set();

    changedFiles.forEach((file) => {
      if (file.startsWith("src/")) {
        if (file === "src/extension.ts") {
          type = "minor";
          changes.add("🔄 Updated core extension functionality");
        }
      } else if (file.startsWith("themes/")) {
        changes.add("✨ Added/modified theme files");
      } else if (file.includes("package.json")) {
        changes.add("📦 Updated package dependencies");
      }
    });

    return {
      type,
      changes: Array.from(changes),
    };
  } catch (error) {
    console.error("Error determining version bump:", error);
    return {
      type: "patch",
      changes: ["🔨 General maintenance and improvements"],
    };
  }
}

async function bumpVersion() {
  const { type, changes } = await determineVersionBump();

  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const currentVersion = packageJson.version;

  // Calculate new version
  const newVersion = semver.inc(currentVersion, type);
  if (!newVersion) {
    throw new Error("Failed to increment version");
  }

  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Update changelog
  updateChangelog(newVersion, changes);

  // Rename existing vsix if it exists
  const vsixDir = path.join(__dirname, "..");
  const files = fs.readdirSync(vsixDir);
  const oldVsix = files.find(
    (f) => f.startsWith("compiled-thought-themes-") && f.endsWith(".vsix")
  );
  if (oldVsix) {
    const newVsixName = `compiled-thought-themes-${newVersion}.vsix`;
    fs.renameSync(path.join(vsixDir, oldVsix), path.join(vsixDir, newVsixName));
  }

  console.log(`Version bumped from ${currentVersion} to ${newVersion}`);
  return newVersion;
}

function updateChangelog(version, changes) {
  const date = new Date().toISOString().split("T")[0];
  const changelogEntry = `
## [${version}] - ${date}

${changes.map((change) => `- ${change}`).join("\n")}
`;

  let changelog = "";
  if (fs.existsSync(changelogPath)) {
    changelog = fs.readFileSync(changelogPath, "utf8");
  } else {
    changelog =
      "# Changelog\n\nAll notable changes to this project will be documented in this file.\n";
  }

  // Insert new changes after the header
  const parts = changelog.split("\n");
  const headerEnd = parts.findIndex((line) => line.startsWith("## "));
  if (headerEnd === -1) {
    changelog += changelogEntry;
  } else {
    parts.splice(headerEnd, 0, changelogEntry);
    changelog = parts.join("\n");
  }

  fs.writeFileSync(changelogPath, changelog);
  console.log("Changelog updated");
}

// Handle script arguments
const command = process.argv[2];
if (command === "bump") {
  bumpVersion().catch(console.error);
} else if (command === "changelog") {
  determineVersionBump()
    .then(({ changes }) =>
      updateChangelog(require("../package.json").version, changes)
    )
    .catch(console.error);
}
