const { execa } = require("execa");

async function publishWebsite() {
  try {
    // Add all changes
    await execa("git", ["add", "."]);

    // Commit changes
    await execa("git", ["commit", "-m", "Website Published"]);

    // Push changes
    try {
      await execa("git", ["push"]);
      console.log("Website published successfully!");
    } catch (pushError) {
      console.error(
        "Failed to push website. Please configure a remote repository."
      );
      console.error(pushError);
    }
  } catch (error) {
    console.error("Failed to publish website:", error);
  }
}

publishWebsite();
