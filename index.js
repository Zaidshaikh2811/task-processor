import fs from "fs";
import simpleGit from "simple-git";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

const REPO_URL = `https://${process.env.GITHUB_TOKEN}@github.com/Zaidshaikh2811/task-processor.git`;
const BRANCH = "main";
const git = simpleGit();

// Function to update remote URL with token
async function updateRemoteWithToken() {
    try {
        // Update remote URL to include token for authentication
        await git.removeRemote('origin');
        await git.addRemote('origin', REPO_URL);
        console.log('✅ Updated remote with authentication token');
    } catch (err) {
        console.error("❌ Error updating remote:", err);
    }
}

// Function to update README and commit
async function commitDaily() {
    try {
        // Update remote URL with token
        await updateRemoteWithToken();

        // Pull latest changes first
        await git.pull("origin", BRANCH);
        console.log('✅ Pulled latest changes');

        const timestamp = new Date().toLocaleString();

        // Check if README.md exists, if not create it
        if (!fs.existsSync('README.md')) {
            fs.writeFileSync('README.md', '# Task Processor\n\nDaily commits from automated bot:\n');
        }

        fs.appendFileSync("README.md", `\n- Commit made at ${timestamp}`);

        await git.add(".");
        await git.commit(`Daily commit: ${timestamp}`);
        await git.push("origin", BRANCH);

        console.log(`✅ Successfully committed and pushed at ${timestamp}`);
    } catch (err) {
        console.error("❌ Error during commit:", err);
    }
}

// Run once immediately
commitDaily();

// Schedule cron job -> runs every day at 12:00
cron.schedule("0 12 * * *", () => {
    commitDaily();
});

console.log("🤖 Daily commit bot started! Next automatic commit at 12:00 PM daily.");