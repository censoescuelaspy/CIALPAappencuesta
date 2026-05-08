const DEFAULT_STATE = {
  endpointUrl: "",
  enabled: true,
  events: []
};

async function render() {
  const state = await chrome.storage.local.get(DEFAULT_STATE);
  document.getElementById("endpointUrl").value = state.endpointUrl;
  document.getElementById("enabled").checked = Boolean(state.enabled);
  document.getElementById("count").textContent = `${state.events.length} eventos`;
  document.getElementById("preview").textContent = state.events
    .slice(0, 10)
    .map((event) => JSON.stringify(event, null, 2))
    .join("\n\n");
}

document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.local.set({
    endpointUrl: document.getElementById("endpointUrl").value.trim(),
    enabled: document.getElementById("enabled").checked
  });
  await render();
});

document.getElementById("clear").addEventListener("click", async () => {
  await chrome.storage.local.set({ events: [] });
  await render();
});

render();
