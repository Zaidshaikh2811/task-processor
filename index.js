import fs from "fs";
import simpleGit from "simple-git";
import cron from "node-cron";
import dotenv from "dotenv";

dotenv.config();

const REPO_URL = `https://${process.env.GITHUB_TOKEN}@github.com/Zaidshaikh2811/task-processor.git`;
const BRANCH = "main";
const git = simpleGit();

// Track daily commits (stored in memory - resets when script restarts)
let dailyCommitCount = 0;
let lastCommitDate = null;

// Function to reset commit count if it's a new day
function checkAndResetDailyCount() {
    const today = new Date().toDateString();
    if (lastCommitDate !== today) {
        dailyCommitCount = 0;
        lastCommitDate = today;
        console.log(`📅 New day detected: ${today}. Commit count reset to 0.`);
    }
}

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

// Function to check if we can make a commit today
function canCommitToday() {
    checkAndResetDailyCount();
    return dailyCommitCount < 3;
}

// Function to update README and commit
async function attemptDailyCommit() {
    try {
        // Check if we've reached the daily limit
        if (!canCommitToday()) {
            console.log(`⏰ Daily commit limit reached (${dailyCommitCount}/3). Skipping until tomorrow.`);
            return;
        }

        console.log(`🔄 Attempting commit ${dailyCommitCount + 1}/3 for today...`);

        // Update remote URL with token
        await updateRemoteWithToken();

        // Pull latest changes first
        await git.pull("origin", BRANCH);
        console.log('✅ Pulled latest changes');

        const timestamp = new Date().toLocaleString();

        // Read existing README.md and add timestamp comment (invisible in rendered markdown)
        let readmeContent = fs.readFileSync('README.md', 'utf8');

        // Remove any existing timestamp comment
        readmeContent = readmeContent.replace(/<!-- Daily commit: .+ -->\n?/g, '');

        // Add new timestamp comment at the end
        readmeContent += `\n<!-- Daily commit: ${timestamp} -->`;

        fs.writeFileSync('README.md', readmeContent);

        await git.add(".");
        await git.commit(`Daily commit ${dailyCommitCount + 1}/3: ${timestamp}`);
        await git.push("origin", BRANCH);

        dailyCommitCount++;
        console.log(`✅ Successfully committed and pushed (${dailyCommitCount}/3) at ${timestamp}`);

        if (dailyCommitCount >= 3) {
            console.log('🎯 Daily commit limit reached! No more commits until tomorrow.');
        }

    } catch (err) {
        console.error("❌ Error during commit:", err);
    }
}

// Function to get next commit times for today
function getNextCommitTimes() {
    const now = new Date();
    const times = [];

    // Calculate remaining commits for today
    checkAndResetDailyCount();
    const remainingCommits = 3 - dailyCommitCount;

    if (remainingCommits <= 0) {
        return ["Daily limit reached"];
    }

    // Show next few 14-minute intervals
    for (let i = 1; i <= Math.min(remainingCommits, 3); i++) {
        const nextTime = new Date(now.getTime() + (14 * i * 60 * 1000));
        times.push(nextTime.toLocaleTimeString());
    }

    return times;
}

// Run once immediately (if under daily limit)
console.log("🤖 Daily commit bot starting...");
attemptDailyCommit();

// Schedule cron job -> runs every 14 minutes
cron.schedule("*/14 * * * *", () => {
    console.log("\n⏰ Cron job triggered - checking if commit is needed...");
    attemptDailyCommit();
});

// Log status every hour
cron.schedule("0 * * * *", () => {
    checkAndResetDailyCount();
    const nextTimes = getNextCommitTimes();
    console.log(`\n📊 Status: ${dailyCommitCount}/3 commits made today`);
    console.log(`🕒 Next potential commit times: ${nextTimes.join(', ')}`);
});

console.log("🚀 Bot is running!");
console.log("📋 Schedule: Every 14 minutes, max 3 commits per day");
console.log(`🕒 Next potential commits: ${getNextCommitTimes().join(', ')}`);