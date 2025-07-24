import fg from "fast-glob";
import fs from "fs/promises";
import path from "path";

const ROOT_DIR = process.cwd();

const rootPkgJsonPath = path.join(ROOT_DIR, "package.json");
const rootPkgJson = JSON.parse(await fs.readFile(rootPkgJsonPath, "utf-8"));
const workspaceGlobs = rootPkgJson.workspaces;
const unifiedVersion = rootPkgJson.version;

const packageDirs = await fg(workspaceGlobs, {
  onlyDirectories: true,
  cwd: ROOT_DIR,
  absolute: true,
});

for (const dir of packageDirs) {
  const pkgPath = path.join(dir, "package.json");
  let pkg;
  try {
    pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
  } catch {
    continue;
  }

  let changed = false;

  const updateSection = (section) => {
    if (!pkg[section]) return;
    for (const depName of Object.keys(pkg[section])) {
      const val = pkg[section][depName];
      if (val.startsWith("workspace:")) {
        pkg[section][depName] = unifiedVersion;
        changed = true;
        // eslint-disable-next-line no-console
        console.log(`[${pkg.name}] ${section}: ${depName} (${val}) → ${unifiedVersion}`);
      }
    }
  };

  updateSection("dependencies");
  updateSection("devDependencies");
  updateSection("peerDependencies");

  if (changed) {
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }
}

// eslint-disable-next-line no-console
console.log(`✅ Todos os workspace:* substituídos por "${unifiedVersion}"`);
