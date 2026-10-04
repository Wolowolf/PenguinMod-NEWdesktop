const { contextBridge, ipcRenderer, webFrame } = require("electron");

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

  enforceSelfTarget();
  new MutationObserver(enforceSelfTarget).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
});
