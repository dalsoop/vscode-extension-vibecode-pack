// Maps each "tool" identifier to the file/folder markers that signal its presence in a target.
// Used for both:
//   (A) sidebar pre-flight: detect whether a tool is already installed in a target folder
//   (B) promote-folder-to-template: detect which tool variants a source folder represents
//
// Add a new tool here once + the rest of the system (apply, sidebar, promote) picks it up.

import * as fs from 'fs';
import * as path from 'path';

export interface ToolMarker {
  /** Marker basename at the root of the target folder (e.g., `.claude`, `.cursorrules`). */
  name: string;
  /** Whether the marker is a directory or a regular file. */
  type: 'dir' | 'file';
}

export const TOOL_MARKERS: Record<string, ToolMarker[]> = {
  claude: [{ name: '.claude', type: 'dir' }],
  codex: [{ name: '.codex', type: 'dir' }],
  cursor: [
    { name: '.cursorrules', type: 'file' },
    { name: '.cursor', type: 'dir' }
  ],
  gemini: [{ name: '.gemini', type: 'dir' }],
  windsurf: [{ name: '.windsurf', type: 'dir' }],
  cline: [
    { name: '.clinerules', type: 'file' },
    { name: '.cline', type: 'dir' }
  ],
  aider: [
    { name: '.aider.conf.yml', type: 'file' },
    { name: '.aider', type: 'dir' }
  ],
  continue: [{ name: '.continue', type: 'dir' }]
};

export type ToolName = keyof typeof TOOL_MARKERS;

/** Return tool names for which AT LEAST ONE marker exists in `targetDir`. */
export async function detectInstalledTools(targetDir: string): Promise<string[]> {
  const present: string[] = [];
  for (const [tool, markers] of Object.entries(TOOL_MARKERS)) {
    for (const m of markers) {
      const p = path.join(targetDir, m.name);
      try {
        const st = await fs.promises.stat(p);
        if ((m.type === 'dir' && st.isDirectory()) || (m.type === 'file' && st.isFile())) {
          present.push(tool);
          break;
        }
      } catch {
        // not present — try next marker
      }
    }
  }
  return present;
}

/** Markers actually present under `targetDir` for a specific tool (subset of TOOL_MARKERS[tool]). */
export async function presentMarkersFor(targetDir: string, tool: string): Promise<ToolMarker[]> {
  const markers = TOOL_MARKERS[tool] ?? [];
  const out: ToolMarker[] = [];
  for (const m of markers) {
    const p = path.join(targetDir, m.name);
    try {
      const st = await fs.promises.stat(p);
      if ((m.type === 'dir' && st.isDirectory()) || (m.type === 'file' && st.isFile())) {
        out.push(m);
      }
    } catch {
      // skip
    }
  }
  return out;
}

/** Copy each present marker of `tool` from `sourceDir` into `destToolDir` preserving structure. */
export async function copyMarkersForTool(
  sourceDir: string,
  tool: string,
  destToolDir: string
): Promise<number> {
  const markers = await presentMarkersFor(sourceDir, tool);
  let copied = 0;
  for (const m of markers) {
    const src = path.join(sourceDir, m.name);
    const dst = path.join(destToolDir, m.name);
    if (m.type === 'file') {
      await fs.promises.mkdir(destToolDir, { recursive: true });
      await fs.promises.copyFile(src, dst);
      copied++;
    } else {
      await copyDirRecursive(src, dst);
      copied++;
    }
  }
  return copied;
}

async function copyDirRecursive(srcDir: string, dstDir: string): Promise<void> {
  await fs.promises.mkdir(dstDir, { recursive: true });
  const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
  for (const e of entries) {
    const src = path.join(srcDir, e.name);
    const dst = path.join(dstDir, e.name);
    if (e.isDirectory()) {
      await copyDirRecursive(src, dst);
    } else if (e.isFile()) {
      await fs.promises.copyFile(src, dst);
    }
  }
}
