import { config } from "../config.js";
import { scanProjects } from "../services/scan-projects.js";

async function main() {
  const candidates = await scanProjects(config.projectsRoot);

  process.stdout.write(
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        projectsRoot: config.projectsRoot,
        count: candidates.length,
        candidates
      },
      null,
      2
    )}\n`
  );
}

main().catch((error: unknown) => {
  console.error("Project scan failed.", error);
  process.exitCode = 1;
});
