import { BrowserWindow, app, session } from "electron";
import path from "path";

export const createWindow = async (startUrl: string) => {
  const preloadPath = path.join(__dirname, "preload.js");
  const isMac = process.platform === "darwin";
  const isWin = process.platform === "win32";
  const startScheme = (() => {
    try {
      return new URL(startUrl).protocol;
    } catch {
      return "munajjam-app:";
    }
  })();

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    icon: path.resolve(app.getAppPath(), "assets", "icon.png"),
    width: 1400,
    height: 900,
    show: false,
    titleBarStyle: isMac ? "hiddenInset" : "default",
    trafficLightPosition: isMac ? { x: 14, y: 14 } : undefined,
    transparent: true,
    vibrancy: isMac ? "under-window" : undefined,
    visualEffectState: isMac ? "active" : undefined,
    titleBarOverlay: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: true,
    },
    backgroundColor: "#00000000",
  };

  if (isWin) {
    (windowOptions as Electron.BrowserWindowConstructorOptions & { backgroundMaterial?: "acrylic" })
      .backgroundMaterial = "acrylic";
  }

  const win = new BrowserWindow(windowOptions);

  win.once("ready-to-show", () => {
    win.center();
    win.show();
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    const message = `Failed to load ${startUrl}\\n\\n${errorDescription} (${errorCode})`;
    const html = `<!doctype html><html><body style='background:#000;color:#fff;font-family:system-ui;padding:24px;'><h2>Munajjam Desktop</h2><p>${message}</p></body></html>`;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    win.show();
  });

  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (event, url) => {
    try {
      const target = new URL(url);
      if (target.protocol !== startScheme) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  try {
    await win.loadURL(startUrl);
  } catch (error) {
    const message = `Failed to load ${startUrl}\\n\\n${String(error)}`;
    const html = `<!doctype html><html><body style='background:#000;color:#fff;font-family:system-ui;padding:24px;'><h2>Munajjam Desktop</h2><p>${message}</p></body></html>`;
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    win.show();
  }
};
