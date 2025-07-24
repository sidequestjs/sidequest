import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fg from 'fast-glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = process.cwd();

const rootPkgJsonPath = path.join(ROOT_DIR, 'package.json');
const rootPkgJson = JSON.parse(await fs.readFile(rootPkgJsonPath, 'utf-8'));
const workspaceGlobs = rootPkgJson.workspaces;
const unifiedVersion = rootPkgJson.version;

const packageDirs = await fg(workspaceGlobs, {
  onlyDirectories: true,
  cwd: ROOT_DIR,
  absolute: true,
});

for (const dir of packageDirs) {
  const pkgPath = path.join(dir, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
  } catch {
    continue;
  }

  let changed = false;

  const updateSection = (section) => {
    if (!pkg[section]) return;
    for (const depName of Object.keys(pkg[section])) {
      const val = pkg[section][depName];
      if (val.startsWith('workspace:')) {
        pkg[section][depName] = unifiedVersion;
        changed = true;
        console.log(`[${pkg.name}] ${section}: ${depName} (${val}) → ${unifiedVersion}`);
      }
    }
  };

  updateSection('dependencies');
  updateSection('devDependencies');
  updateSection('peerDependencies');

  if (changed) {
    await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
}

console.log(`✅ Todos os workspace:* substituídos por "${unifiedVersion}"`);
