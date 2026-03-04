import path from "path";
import { dialog } from "electron";
import {
  assertRecord,
  asOptionalString,
} from "../validation";
import type { RegisterContext, RegisterHandler } from "./register-types";

export function registerDialogHandlers(
  register: RegisterHandler,
  { approvePath, issueExportTicket, audioExtensions }: RegisterContext,
) {
  register("dialog:selectFolder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const selected = path.resolve(result.filePaths[0]);
    approvePath(selected);
    return selected;
  });

  register("dialog:selectAudioFiles", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Audio", extensions: [...audioExtensions] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const filePaths = result.filePaths.map((filePath) => path.resolve(filePath));
    for (const filePath of filePaths) {
      approvePath(path.dirname(filePath));
    }
    return filePaths;
  });

  register("dialog:selectImage", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return path.resolve(result.filePaths[0]);
  });

  register("dialog:saveFile", async (_event, options) => {
    if (options !== undefined) {
      assertRecord(options, "options");
    }

    const result = await dialog.showSaveDialog({
      defaultPath:
        options && "defaultPath" in options
          ? asOptionalString(options.defaultPath, "options.defaultPath")
          : undefined,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (result.canceled || !result.filePath) return null;

    const resolvedPath = path.resolve(result.filePath);
    approvePath(path.dirname(resolvedPath));
    return { token: issueExportTicket(resolvedPath) };
  });
}
