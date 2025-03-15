const { exec } = require("child_process");

const runCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${error.message}`);
        return;
      }
      // Ignore LF/CRLF warnings but capture other stderr messages
      if (stderr && !stderr.includes("LF will be replaced by CRLF")) {
        reject(`Stderr: ${stderr}`);
        return;
      }
      resolve(stdout.trim());
    });
  });
};

const pushChanges = async () => {
  try {
    console.log("Staging all files...");
    await runCommand("git add .");

    console.log("Committing changes...");
    await runCommand('git commit -m "Books Published"');

    console.log("Fetching current branch...");
    const branch = await runCommand("git rev-parse --abbrev-ref HEAD");

    console.log(`Pushing to ${branch}...`);
    await runCommand(`git push origin ${branch}`);

    console.log("✅ Push successful!");
  } catch (error) {
    console.error(`❌ Failed: ${error}`);
  }
};

pushChanges();
