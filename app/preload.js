const { contextBridge, ipcRenderer, webFrame } = require("electron");

// Starts the audio service while the page loads, so the editor's first AudioContext doesn't wait for it (370 ms).
navigator.mediaDevices?.enumerateDevices().catch(() => { });

function sendSync(channel, payload) {
  try {
    return ipcRenderer.sendSync(channel, payload);
  } catch (err) {
    console.error("[preload] sync ipc failed", channel, err);
    return null;
  }
}

contextBridge.exposeInMainWorld("__electronInternalBridge", {
  alert: msg => sendSync("electron-alert", String(msg ?? "")),
  confirm: msg => !!sendSync("electron-confirm", String(msg ?? "")),
  prompt: (msg, def) => sendSync("electron-prompt-sync", { message: msg, defaultValue: def }),
  notifyThemeChanged: () => { } // dummy stub to prevent page exceptions
});

// For the asset libraries: open a key sign-up page in the user's browser, and download a picture or
// sound from a site that doesn't let pages download it (see "pm-open-external" / "pm-fetch-bytes").
contextBridge.exposeInMainWorld("PMDesktop", {
  openExternal: url => ipcRenderer.invoke("pm-open-external", String(url)),
  fetchBytes: (url, range) => ipcRenderer.invoke("pm-fetch-bytes", String(url), range === undefined ? undefined : String(range)),
});

// For the Google Auth / Discord Auth extensions: log in through the user's own browser
// (see "pm-login-loopback" in electron-main.js; packaged desktop games have the same).
contextBridge.exposeInMainWorld("PMLogin", {
  loopback: url => ipcRenderer.invoke("pm-login-loopback", String(url)),
  cancel: () => ipcRenderer.invoke("pm-login-cancel"),
});

window.addEventListener("DOMContentLoaded", async () => {
  webFrame.executeJavaScript(`
  (() => {
    window.alert = (msg) => window.__electronInternalBridge.alert(msg);
    window.confirm = (msg) => window.__electronInternalBridge.confirm(msg);
    window.prompt = (msg, def) => window.__electronInternalBridge.prompt(msg, def);
  })();
  `);

  // bypass target blank redirect to open in standard tab
  const enforceSelfTarget = () => {
    document.querySelectorAll("a[href]").forEach(a => {
      try {
        const url = new URL(a.href, window.location.href);
        const isEditor = url.host === "studio.penguinmod.com" || url.protocol === "editor:";
        if (isEditor && a.getAttribute("target") !== "_self") {
          a.setAttribute("target", "_self");
        }
      } catch { }
    });
  };

  // update progress overlay (shown while the in-app updater downloads and installs)
  const overlay = document.createElement("div");
  overlay.style.cssText =
    "display:none;position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.75);" +
    "color:#fff;font:16px sans-serif;align-items:center;justify-content:center;flex-direction:column;gap:12px";
  const label = document.createElement("div");
  const bar = document.createElement("div");
  bar.style.cssText = "width:320px;height:10px;background:#444";
  const fill = document.createElement("div");
  fill.style.cssText = "height:100%;width:0;background:#4c97ff";
  bar.appendChild(fill);
  overlay.append(label, bar);
  document.body.appendChild(overlay);

  const PHASES = {
    download: "Downloading update…",
    compare: "Checking files…",
    write: "Preparing new files…",
    swap: "Installing…",
    library: "Unpacking the offline library…",
  };
  ipcRenderer.on("update-progress", (_event, msg) => {
    if (!msg || msg.phase === "done") {
      overlay.style.display = "none";
      return;
    }
    overlay.style.display = "flex";
    label.textContent = (PHASES[msg.phase] || "Updating…") + (msg.phase === "download" && msg.text ? "  " + msg.text.replace(/^Downloading… /, "") : "");
    fill.style.width = msg.percent >= 0 ? msg.percent + "%" : "100%";
  });

  // The window has no title bar: minimise, full screen and close sit at the far right of the editor's blue menu bar,
  // and the bar itself drags the window.
  const barStyle = document.createElement("style");
  barStyle.textContent =
    '[class*="menu-bar_menu-bar_"]{-webkit-app-region:drag}' +
    '[class*="menu-bar_menu-bar_"] :is(button,a,input,select,textarea,label,[role=button],[class*="menu-bar_menu-bar-item"],[class*="button"],[class*="menu"]){-webkit-app-region:no-drag}' +
    "#pm-window-controls{position:fixed;top:0;right:0;height:3rem;display:flex;z-index:2147483646;-webkit-app-region:no-drag}" +
    "#pm-window-controls button{width:46px;height:100%;border:0;background:transparent;color:#fff;font:16px sans-serif;cursor:pointer}" +
    "#pm-window-controls button:hover{background:rgba(255,255,255,0.2)}" +
    "#pm-window-controls button.pm-close:hover{background:#e81123}";
  document.head.appendChild(barStyle);
  const controls = document.createElement("div");
  controls.id = "pm-window-controls";
  for (const [action, text, title, cls] of [["minimize", "\u2013", "Minimize", ""], ["fullscreen", "\u26F6", "Full screen", ""], ["close", "\u2715", "Exit", "pm-close"]]) {
    const b = document.createElement("button");
    b.textContent = text;
    b.title = title;
    if (cls) b.className = cls;
    b.addEventListener("click", () => ipcRenderer.send("pm-window-control", action));
    controls.appendChild(b);
  }
  document.body.appendChild(controls);

  enforceSelfTarget();
  new MutationObserver(enforceSelfTarget).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
});
