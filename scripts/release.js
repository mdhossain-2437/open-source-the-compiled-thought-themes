const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

async function createRelease() {
  try {
    // 1. Ensure working directory is clean
    try {
      execSync("git diff --quiet HEAD");
    } catch (error) {
      console.error(
        "Working directory is not clean. Please commit or stash changes first."
      );
      process.exit(1);
    }

    // 2. Bump version and update changelog
    console.log("Bumping version and updating changelog...");
    execSync("npm run version:bump", { stdio: "inherit" });

    // 3. Get new version
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8")
    );
    const version = packageJson.version;

    // 4. Build and package extension
    console.log("Building and packaging extension...");
    execSync("npm run compile", { stdio: "inherit" });
    execSync("npm run package", { stdio: "inherit" });

    // 5. Commit changes
    console.log("Committing changes...");
    execSync("git add .", { stdio: "inherit" });
    execSync(`git commit -m "Release v${version}"`, { stdio: "inherit" });

    // 6. Create git tag
    console.log("Creating git tag...");
    execSync(`git tag -a v${version} -m "Version ${version}"`, {
      stdio: "inherit",
    });

    // 7. Push changes and tags
    console.log("Pushing to remote...");
    execSync("git push", { stdio: "inherit" });
    execSync("git push --tags", { stdio: "inherit" });

    // 8. Create GitHub release using the GitHub CLI if available
    try {
      const changelog = fs.readFileSync(
        path.join(__dirname, "..", "CHANGELOG.md"),
        "utf8"
      );
      const latestChanges = changelog.split("## ")[1].split("\n\n")[1];

      execSync(
        `gh release create v${version} compiled-thought-themes-${version}.vsix --title "v${version}" --notes "${latestChanges}"`,
        { stdio: "inherit" }
      );
    } catch (error) {
      console.log(
        "GitHub CLI not available. Skipping GitHub release creation."
      );
      console.log("Please create the release manually on GitHub.");
    }

    // 9. Publish to VS Code Marketplace
    console.log("Publishing to VS Code Marketplace...");
    execSync("npm run publish", { stdio: "inherit" });

    console.log(`✨ Successfully released version ${version}!`);
  } catch (error) {
    console.error("Error during release:", error);
    process.exit(1);
  }
}

createRelease().catch(console.error);
