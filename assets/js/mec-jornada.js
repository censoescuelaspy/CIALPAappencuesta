const MEC_MODULE_URL = "https://demo.mec.gov.py/demo_rue/infraestructuras_fiscalizaciones_v2/index";
const MEC_LOGIN_URL = "https://demo.mec.gov.py/demo_rue/login";
const STORAGE_KEY = "cialpa_mec_active_session";

const loginPanel = document.getElementById("loginPanel");
const sessionPanel = document.getElementById("sessionPanel");
const loginForm = document.getElementById("cialpaLoginForm");
const sessionTitle = document.getElementById("sessionTitle");
const sessionMeta = document.getElementById("sessionMeta");
const startedAt = document.getElementById("startedAt");
const contextPreview = document.getElementById("contextPreview");
const sessionState = document.getElementById("sessionState");

function sessionId() {
  return `cialpa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function encodeContext(context) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(context))));
}

function buildMecUrl(context) {
  const url = new URL(MEC_LOGIN_URL);
  url.searchParams.set("cialpa_context", encodeContext(context));
  url.searchParams.set("cialpa_target", MEC_MODULE_URL);
  return url.toString();
}

function getFormContext() {
  const formData = new FormData(loginForm);
  const now = new Date();

  return {
    cialpaSessionId: sessionId(),
    startedAt: now.toISOString(),
    surveyorName: String(formData.get("surveyorName") || "").trim(),
    surveyorDocument: String(formData.get("surveyorDocument") || "").trim(),
    team: String(formData.get("team") || "").trim(),
    schoolCode: String(formData.get("schoolCode") || "").trim(),
    mecModuleUrl: MEC_MODULE_URL,
    status: "started"
  };
}

function renderSession(context) {
  loginPanel.classList.add("hidden");
  sessionPanel.classList.remove("hidden");
  sessionTitle.textContent = context.surveyorName || "Jornada activa";
  sessionMeta.textContent = `${context.surveyorDocument || "Sin documento"} · ${context.team || "Sin equipo"} · ${context.schoolCode || "Sin local"}`;
  startedAt.textContent = new Date(context.startedAt).toLocaleString();
  sessionState.textContent = context.status === "mec_opened" ? "MEC abierto" : "Preparada";
  contextPreview.textContent = JSON.stringify(context, null, 2);
}

function loadSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    renderSession(JSON.parse(raw));
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const context = getFormContext();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  renderSession(context);
});

document.getElementById("openMec").addEventListener("click", () => {
  const context = JSON.parse(localStorage.getItem(STORAGE_KEY));
  const updated = {
    ...context,
    mecOpenedAt: new Date().toISOString(),
    status: "mec_opened"
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  renderSession(updated);
  window.open(buildMecUrl(updated), "_blank", "noopener");
});

document.getElementById("copyContext").addEventListener("click", async () => {
  const context = localStorage.getItem(STORAGE_KEY) || "";
  await navigator.clipboard.writeText(context);
});

document.getElementById("closeSession").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  sessionPanel.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  loginForm.reset();
});

loadSession();
