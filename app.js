const clock = document.getElementById("clock");
const appsEl = document.getElementById("apps");
const startBtn = document.getElementById("start-btn");
const startMenu = document.getElementById("start-menu");
const tooltip = document.getElementById("tooltip");
const contextMenu = document.getElementById("context-menu");
const dialog = document.getElementById("edit-dialog");
const ampmEl = document.getElementById("ampm");
const dateEl = document.getElementById("date");

// tick the clock every 1000ms which is 1 second, format is hh:mm
function tick() {
  clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, "");
  ampmEl.textContent = new Date().getHours() < 12 ? "AM" : "PM";
  dateEl.textContent = new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

const DEFAULT_APPS = [
    {
        name: "DuckDuckGo",
        url: "https://duckduckgo.com",
    },
    {
        name: "YouTube",
        url: "https://www.youtube.com"
    },
    {
        name: "GMail",
        url: "https://mail.google.com"
    },
    {
        name: "GitHub",
        url: "https://github.com"
    }
];

let apps = [] //for now


function hasStorage() {
  return typeof chrome !== "undefined" && !!chrome.storage;
}

async function loadApps() {
    if(!hasStorage()) {
        apps = DEFAULT_APPS;
        return;
    }

    const {apps: stored } = await chrome.storage.local.get("apps");
    apps = stored ?? DEFAULT_APPS; // if no app, use default app  -sun tzu, art of war
}

async function saveApps() {
    if(hasStorage()) {
        await chrome.storage.local.set({apps});
    }
}

//get website icon, alsoc alled favicon
function getFavicon(url) {
  try {
    return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(new URL(url).href)}&size=128`;
  } catch {
    return letterIcon(url);
  }
}
function letterIcon(name) {
    const letter = (name[0] || "▣").toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="14" fill="#3a3a4a"/><text x="32" y="42" font-size="30" text-anchor="middle" fill="#fff" font-family="system-ui">${letter}</text></svg>`; //oh my
    return "data:image/svg+xml," + encodeURIComponent(svg);
}

function drawAppsonDock() {
    appsEl.innerHTML = "";
    apps.forEach((app, i) => {
        const btn = document.createElement("button");
        const img = document.createElement("img");

        img.src = getFavicon(app.url);
        img.alt = app.name;
        img.onerror = () => (img.src = letterIcon(app.name));
        btn.append(img);
        btn.addEventListener("click", () => openApp(i));
        btn.addEventListener("contextmenu", (e) => showContextMenu(e, i));
        btn.addEventListener("mouseenter", (e) => showTooltip(e, i));
        btn.addEventListener("mousemove", moveTooltip);
        btn.addEventListener("mouseleave", hideTooltip);
        appsEl.append(btn);
    });
}

function openApp(i) {
    if (apps[i]) window.location.href = apps[i].url;
}

function showTooltip(e, i) {
  const app = apps[i];
  if (!app) { hideTooltip(); return; }
  const hint = i < 9 ? ` (Ctrl+Alt+${i + 1})` : "";
  tooltip.textContent = app.name + hint;
  tooltip.hidden = false;
  moveTooltip(e);
}

function moveTooltip(e) {
  tooltip.style.left = e.clientX + "px";
  tooltip.style.bottom = innerHeight - e.clientY + 18 + "px";
}

function hideTooltip() {
  tooltip.hidden = true;
}

let activeIndex = null;

function showContextMenu(e, i) {
  e.preventDefault();
  hideTooltip();
  activeIndex = i;
  contextMenu.hidden = false;
  const w = contextMenu.offsetWidth;
  const h = contextMenu.offsetHeight;
  contextMenu.style.left = Math.min(e.clientX, innerWidth - w - 8) + "px";
  contextMenu.style.top = Math.min(e.clientY, innerHeight - h - 8) + "px";
}

document.getElementById("sc-edit").addEventListener("click", () => {
  contextMenu.hidden = true;
  openDialog("edit", activeIndex);
});

document.getElementById("sc-delete").addEventListener("click", async () => {
  contextMenu.hidden = true;
  apps.splice(activeIndex, 1);
  await saveApps()
  drawAppsonDock();
});

document.addEventListener("click", (e) => {
  if (!contextMenu.hidden && !contextMenu.contains(e.target)) contextMenu.hidden = true;
  if (startMenu.classList.contains("open") && !startMenu.contains(e.target) && !startBtn.contains(e.target)) startMenu.classList.remove("open");
});

let editingIndex = null;

function openDialog(mode, index = null) {
  hideTooltip();
  if (index !== null && !apps[index]) return;
  editingIndex = index;
  document.getElementById("dialog-title").textContent = mode === "edit" ? "Edit shortcut" : "Add shortcut";
  document.getElementById("f-name").value = index === null ? "" : apps[index].name;
  document.getElementById("f-url").value = index === null ? "" : apps[index].url;
  dialog.showModal();
}

document.getElementById("add-btn").addEventListener("click", () => openDialog("add"));
document.getElementById("f-cancel").addEventListener("click", () => dialog.close());

dialog.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("f-name").value.trim();
  let url = document.getElementById("f-url").value.trim();
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  if (editingIndex === null) apps.push({ name, url });
  else apps[editingIndex] = { name, url };
  await saveApps();
  drawAppsonDock();
  dialog.close();
});

startBtn.addEventListener("click", () => {
  const r = startBtn.getBoundingClientRect();
  startMenu.style.left = r.left + "px";
  startMenu.style.bottom = innerHeight - r.top + 14 + "px";
  startMenu.classList.toggle("open");
});

const KEY_TO_NUMBER = { // i use e.code here, coz europe keyboard, and e.key returns char the key types.
  Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5,
  Digit6: 6, Digit7: 7, Digit8: 8, Digit9: 9,
  Numpad1: 1, Numpad2: 2, Numpad3: 3, Numpad4: 4, Numpad5: 5,
  Numpad6: 6, Numpad7: 7, Numpad8: 8, Numpad9: 9,
};

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.altKey && !e.shiftKey && !e.metaKey) {
    const n = KEY_TO_NUMBER[e.code];
    if (n) {
      e.preventDefault();
      openApp(n - 1);
    }
  }
  if (e.key === "Escape") {
    contextMenu.hidden = true;
    startMenu.classList.remove("open");
  }
});

if (hasStorage()) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.apps) {
      apps = changes.apps.newValue ?? DEFAULT_APPS;
      drawAppsonDock();
    }
  });
}

tick();
setInterval(tick, 1000);
loadApps().then(drawAppsonDock);
