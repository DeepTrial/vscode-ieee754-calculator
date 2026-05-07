const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");
const testMode = process.argv.includes("--test");

async function main() {
  if (testMode) {
    // Build and run tests
    const ctx = await esbuild.context({
      entryPoints: ["src/test/engine.test.ts"],
      bundle: true,
      format: "cjs",
      platform: "node",
      outfile: "dist/test/engine.test.js",
      sourcemap: false,
      sourcesContent: false,
    });
    await ctx.rebuild();
    await ctx.dispose();
    console.log("Test bundle built. Running tests...");
    // exec the test file
    require("child_process").execSync("node dist/test/engine.test.js", { stdio: "inherit" });
    return;
  }

  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
  });

  if (watch) {
    await ctx.watch();
    console.log("watching...");
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
