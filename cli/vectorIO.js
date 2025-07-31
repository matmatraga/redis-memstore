// cli/vectorIO.js

const path = require("path");
const readline = require("readline");
const {
  saveIndexToFile,
  loadIndexFromFile,
  addToIndex,
  searchKNN,
} = require("../server/utils/vectorIndex");
const {
  parseVector,
  euclideanDistance,
} = require("../server/utils/vectorUtils");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "vectorIO> ",
});

console.log("📦 Vector IO CLI started.");
console.log("Commands:");
console.log("  load <file>         Load vectors from JSON file");
console.log("  save <file>         Save vectors to JSON file");
console.log(
  "  add <key> <vector>  Add a vector to the index (e.g. add vec1 [1,2,3])"
);
console.log("  knn <vector> <k>    Search top-k nearest neighbors");
console.log("  exit                Exit CLI\n");

rl.prompt();

rl.on("line", (line) => {
  const [cmd, ...args] = line.trim().split(" ");

  try {
    switch (cmd) {
      case "load": {
        const filePath = path.resolve(args[0]);
        loadIndexFromFile(filePath);
        break;
      }
      case "save": {
        const filePath = path.resolve(args[0]);
        saveIndexToFile(filePath);
        break;
      }
      case "add": {
        const key = args[0];
        const vectorStr = args.slice(1).join(" ");
        const vector = parseVector(vectorStr);
        addToIndex(key, vector);
        console.log(`✅ Added vector "${key}"`);
        break;
      }
      case "knn": {
        const vectorStr = args.slice(0, -1).join(" ");
        const k = parseInt(args[args.length - 1], 10);
        const vector = parseVector(vectorStr);
        const results = searchKNN(vector, k, euclideanDistance);
        console.log("🔍 KNN Results:");
        results.forEach((r, i) => {
          console.log(`${i + 1}. ${r.key} (dist=${r.dist.toFixed(4)})`);
        });
        break;
      }
      case "exit":
        rl.close();
        return;
      default:
        console.log("❓ Unknown command");
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  rl.prompt();
});

rl.on("close", () => {
  console.log("👋 Exiting Vector IO CLI.");
  process.exit(0);
});
