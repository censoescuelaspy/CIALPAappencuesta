const DEFAULT_STATE = {
  endpointUrl: "",
  enabled: true,
  events: [],
  activeContexts: {}
};

async function getState() {
  return chrome.storage.local.get(DEFAULT_STATE);
}

async function saveEvent(event) {
  const state = await getState();
  const events = [event, ...state.events].slice(0, 500);
  await chrome.storage.local.set({ events });
  return { ...state, events };
}

async function contextForTab(tabId) {
  const state = await getState();
  if (!tabId) return null;
  return state.activeContexts[String(tabId)] || null;
}

async function setContextForTab(tabId, context) {
  if (!tabId) return;
  const state = await getState();
  const activeContexts = {
    ...state.activeContexts,
    [String(tabId)]: context
  };
  await chrome.storage.local.set({ activeContexts });
}

async function sendEvent(endpointUrl, event) {
  if (!endpointUrl) return { skipped: true };

  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(event)
  });

  return {
    ok: response.ok,
    status: response.status
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    const state = await getState();
    const tabId = sender.tab && sender.tab.id;

    if (message.type === "CIALPA_MEC_CONTEXT_SET") {
      await setContextForTab(tabId, message.payload.context);
      const event = {
        kind: "context_set",
        tabId,
        cialpaContext: message.payload.context,
        targetUrl: message.payload.targetUrl,
        capturedAt: message.payload.capturedAt,
        url: message.payload.url
      };
      await saveEvent(event);
      sendResponse({ ok: true });
      return;
    }

    if (!state.enabled) {
      sendResponse({ ok: true, skipped: "disabled" });
      return;
    }

    if (message.type === "CIALPA_MEC_PAGE_READY") {
      const event = {
        kind: "page_ready",
        tabId,
        cialpaContext: await contextForTab(tabId),
        ...message.payload
      };
      await saveEvent(event);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CIALPA_MEC_FIELD_CAPTURED") {
      const event = {
        kind: "field_captured",
        tabId,
        cialpaContext: await contextForTab(tabId),
        ...message.payload
      };
      await saveEvent(event);

      try {
        const delivery = await sendEvent(state.endpointUrl, event);
        sendResponse({ ok: true, delivery });
      } catch (error) {
        sendResponse({ ok: true, delivery: { ok: false, error: error.message } });
      }
    }

    if (message.type === "CIALPA_MEC_BUTTON_CLICKED") {
      const event = {
        kind: "button_clicked",
        tabId,
        cialpaContext: await contextForTab(tabId),
        ...message.payload
      };
      await saveEvent(event);

      try {
        const delivery = await sendEvent(state.endpointUrl, event);
        sendResponse({ ok: true, delivery });
      } catch (error) {
        sendResponse({ ok: true, delivery: { ok: false, error: error.message } });
      }
      return;
    }

    if (message.type === "CIALPA_MEC_FORM_SUBMITTED") {
      const event = {
        kind: "form_submitted",
        tabId,
        cialpaContext: await contextForTab(tabId),
        ...message.payload
      };
      await saveEvent(event);

      try {
        const delivery = await sendEvent(state.endpointUrl, event);
        sendResponse({ ok: true, delivery });
      } catch (error) {
        sendResponse({ ok: true, delivery: { ok: false, error: error.message } });
      }
    }
  })();

  return true;
});
