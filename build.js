const path = require("path");
const child_process = require("child_process");

const install = process.argv.includes("--install");
const build = process.argv.includes("--build");
const root = process.cwd();

console.log("\u001b[36m ===================================================================");
if (install)
    console.log('\u001b[36m                   Installing back-end ("yarn")                     ');
if (build)
    console.log('\u001b[36m                 Building back-end ("yarn build")                   ');
console.log("\u001b[36m ===================================================================");
console.log("\u001b[0m");

if (install) command("yarn", path.join(root, "server"));
if (build) command("yarn build", path.join(root, "server"));

console.log("\n\n");
console.log("\u001b[36m ===================================================================");
if (install)
    console.log('\u001b[36m                   Installing front-end ("yarn")                    ');
if (build)
    console.log('\u001b[36m                 Building front-end ("yarn build")                  ');
console.log("\u001b[36m ===================================================================");
console.log("\u001b[0m");

if (install) command("yarn", path.join(root, "client"));
if (build) command("yarn build", path.join(root, "client"));

console.log("\n\n");
console.log("\u001b[32m ===================================================================");
if (install)
    console.log("\u001b[32m                  Installed font-end and back-end                   ");
if (build)
    console.log("\u001b[32m                    Build font-end and back-end                     ");
console.log("\u001b[32m ===================================================================");
console.log("\u001b[0m");

function command(command, location) {
    child_process.execSync(command, { cwd: location, env: process.env, stdio: "inherit" });
}
