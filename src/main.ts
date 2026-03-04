import { app, BrowserWindow, protocol } from "electron";
import path from "path";
import { LocalDb } from "./db";
import { JobsManager } from "./jobs";
import { registerIpc, broadcastJobUpdate } from "./ipc";
import { quranCsvPath } from "./paths";
import { registerAppProtocol, registerMediaProtocol } from "./protocols";
import { createWindow } from "./window";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "munajjam",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
  {
    scheme: "munajjam-app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

app.setName("Munajjam");

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
}

app.whenReady().then(async () => {
  registerMediaProtocol();
  registerAppProtocol();

  const dbPath = path.join(app.getPath("userData"), "munajjam.db");
  const db = new LocalDb(dbPath);
  const jobs = new JobsManager(db, broadcastJobUpdate);

  registerIpc({
    db,
    jobs,
    quranCsvPath: quranCsvPath(),
  });

  const startUrl = process.env.MUNAJJAM_DEV_URL || "munajjam-app://app/en";

  await createWindow(startUrl);

  app.on("second-instance", () => {
    const [existing] = BrowserWindow.getAllWindows();
    if (!existing) return;
    if (existing.isMinimized()) existing.restore();
    existing.focus();
  });

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow(startUrl);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
