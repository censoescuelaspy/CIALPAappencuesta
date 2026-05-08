(() => {
  const SENSITIVE_NAME = /(password|captcha|authenticity_token|csrf|token|session|utf8)/i;
  const CAPTURE_SELECTOR = [
    "input:not([type=password]):not([type=hidden])",
    "select",
    "textarea"
  ].join(",");
  const BUTTON_SELECTOR = [
    "button",
    "input[type=submit]",
    "input[type=button]",
    "a[role=button]",
    "[data-action]"
  ].join(",");
  const pageSessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const pageLoadedAt = new Date();
  let firstInteractionAt = null;
  let sequence = 0;
  let fieldCount = 0;
  const focusState = new WeakMap();

  function decodeContext(value) {
    try {
      return JSON.parse(decodeURIComponent(escape(atob(value))));
    } catch (error) {
      return null;
    }
  }

  function captureContextFromUrl() {
    const params = new URLSearchParams(location.search);
    const encodedContext = params.get("cialpa_context");
    if (!encodedContext) return;

    const context = decodeContext(encodedContext);
    if (!context) return;

    chrome.runtime.sendMessage({
      type: "CIALPA_MEC_CONTEXT_SET",
      payload: {
        context,
        targetUrl: params.get("cialpa_target") || context.mecModuleUrl || null,
        capturedAt: new Date().toISOString(),
        url: location.href
      }
    });
  }

  function fieldLabel(element) {
    if (element.id) {
      const byFor = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (byFor && byFor.textContent.trim()) return byFor.textContent.trim();
    }

    const parentLabel = element.closest("label");
    if (parentLabel && parentLabel.textContent.trim()) return parentLabel.textContent.trim();

    return element.getAttribute("aria-label") ||
      element.getAttribute("placeholder") ||
      element.name ||
      element.id ||
      element.tagName.toLowerCase();
  }

  function selectedText(element) {
    if (element.tagName !== "SELECT") return null;
    return Array.from(element.selectedOptions || []).map((option) => option.textContent.trim());
  }

  function fieldValue(element) {
    if (element.type === "checkbox") return Boolean(element.checked);
    if (element.type === "radio") return element.checked ? element.value : null;
    return element.value;
  }

  function shouldCapture(element) {
    if (!element.matches(CAPTURE_SELECTOR)) return false;
    if (element.disabled) return false;
    if (SENSITIVE_NAME.test(element.name || "") || SENSITIVE_NAME.test(element.id || "")) return false;
    if (element.type === "radio" && !element.checked) return false;
    return true;
  }

  function isSensitiveField(element) {
    if (SENSITIVE_NAME.test(element.name || "") || SENSITIVE_NAME.test(element.id || "")) return true;
    if (element.type === "password") return true;
    return false;
  }

  function nowEnvelope(eventType) {
    const now = new Date();
    if (!firstInteractionAt) firstInteractionAt = now;
    sequence += 1;

    return {
      now,
      envelope: {
        source: "mec-demo-rue",
        pageSessionId,
        sequence,
        eventType,
        capturedAt: now.toISOString(),
        pageLoadedAt: pageLoadedAt.toISOString(),
        elapsedMs: now.getTime() - pageLoadedAt.getTime(),
        firstInteractionElapsedMs: firstInteractionAt.getTime() - pageLoadedAt.getTime(),
        url: location.href,
        path: location.pathname,
        title: document.title
      }
    };
  }

  function buildFieldEvent(element, eventType, extra) {
    const { envelope } = nowEnvelope(eventType);
    return {
      ...envelope,
      field: {
        id: element.id || null,
        name: element.name || null,
        label: fieldLabel(element),
        tag: element.tagName.toLowerCase(),
        type: element.type || null,
        value: fieldValue(element),
        selectedText: selectedText(element),
        ...(extra || {})
      }
    };
  }

  function emitFieldCapture(element, eventType) {
    if (!shouldCapture(element)) return;
    fieldCount += 1;
    chrome.runtime.sendMessage({
      type: "CIALPA_MEC_FIELD_CAPTURED",
      payload: buildFieldEvent(element, eventType)
    });
  }

  function emitFieldBlur(element, timeOnFieldMs) {
    if (!element || !element.matches || !element.matches(CAPTURE_SELECTOR)) return;
    if (isSensitiveField(element)) return;

    chrome.runtime.sendMessage({
      type: "CIALPA_MEC_FIELD_CAPTURED",
      payload: buildFieldEvent(element, "blur", { timeOnFieldMs })
    });
  }

  function buttonLabel(element) {
    if (element.tagName === "INPUT") return element.value || element.name || "boton";
    const text = (element.textContent || "").trim();
    if (text) return text.slice(0, 80);
    return element.getAttribute("aria-label") || element.name || element.id || "boton";
  }

  function emitButtonClick(element) {
    const { envelope } = nowEnvelope("button_click");
    chrome.runtime.sendMessage({
      type: "CIALPA_MEC_BUTTON_CLICKED",
      payload: {
        ...envelope,
        button: {
          id: element.id || null,
          name: element.name || null,
          tag: element.tagName.toLowerCase(),
          type: element.type || null,
          label: buttonLabel(element),
          dataAction: element.getAttribute("data-action") || null
        }
      }
    });
  }

  document.addEventListener("change", (event) => {
    emitFieldCapture(event.target, "change");
  }, true);

  document.addEventListener("input", (event) => {
    const element = event.target;
    if (!element.matches("textarea,input[type=text],input[type=number],input[type=date],input:not([type])")) {
      return;
    }
    emitFieldCapture(element, "input");
  }, true);

  document.addEventListener("focusin", (event) => {
    const element = event.target;
    if (!element.matches || !element.matches(CAPTURE_SELECTOR)) return;
    if (isSensitiveField(element)) return;
    focusState.set(element, Date.now());
  }, true);

  document.addEventListener("focusout", (event) => {
    const element = event.target;
    const startedAt = focusState.get(element);
    if (!startedAt) return;
    focusState.delete(element);
    emitFieldBlur(element, Date.now() - startedAt);
  }, true);

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!target || !target.closest) return;
    const button = target.closest(BUTTON_SELECTOR);
    if (!button) return;
    if (button.type === "submit") return;
    emitButtonClick(button);
  }, true);

  document.addEventListener("submit", (event) => {
    const { envelope } = nowEnvelope("submit");
    chrome.runtime.sendMessage({
      type: "CIALPA_MEC_FORM_SUBMITTED",
      payload: {
        ...envelope,
        form: {
          id: event.target.id || null,
          name: event.target.name || null,
          action: event.target.action || null,
          method: event.target.method || null,
          capturedFieldCount: fieldCount
        }
      }
    });
  }, true);

  captureContextFromUrl();

  chrome.runtime.sendMessage({
    type: "CIALPA_MEC_PAGE_READY",
    payload: {
      source: "mec-demo-rue",
      pageSessionId,
      eventType: "page_ready",
      capturedAt: pageLoadedAt.toISOString(),
      pageLoadedAt: pageLoadedAt.toISOString(),
      elapsedMs: 0,
      url: location.href,
      path: location.pathname,
      title: document.title,
      fieldCount: document.querySelectorAll(CAPTURE_SELECTOR).length
    }
  });
})();
