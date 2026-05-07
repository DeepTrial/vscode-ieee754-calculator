(function () {
  const vscode = acquireVsCodeApi();

  let state = {
    format: 64,
    a: { value: "0.0", parsed: null },
    b: { value: "0.0", parsed: null },
    result: null,
  };

  const formatLabels = { 16: "binary16", 32: "binary32", 64: "binary64", 128: "binary128" };

  function render() {
    const app = document.getElementById("app");
    app.innerHTML = `
      <div class="section">
        <div class="format-buttons">
          ${[16, 32, 64, 128].map(
            (s) =>
              `<button class="format-btn ${state.format === s ? "active" : ""}" data-format="${s}">${formatLabels[s]}</button>`
          ).join("")}
        </div>
      </div>

      <div class="section">
        <div class="section-label">Value A</div>
        ${renderValueRow("a", state.a)}
      </div>

      <div class="section">
        <div class="section-label">Value B</div>
        ${renderValueRow("b", state.b)}
      </div>

      <div class="section">
        <div class="arithmetic-panel">
          <button class="arith-btn" data-op="+">+</button>
          <button class="arith-btn" data-op="-">&minus;</button>
          <button class="arith-btn" data-op="*">&times;</button>
          <button class="arith-btn" data-op="/">&divide;</button>
        </div>
      </div>

      <div class="section">
        <div class="section-label">Result</div>
        ${state.result ? renderResultRow(state.result) : renderEmptyResult()}
      </div>
    `;

    bindEvents();
  }

  function renderValueRow(id, data) {
    const p = data.parsed;
    if (!p) {
      return `
        <div class="value-row">
          <div class="input-row">
            <label>Value</label>
            <input type="text" id="input-${id}" value="${data.value}" placeholder="e.g. 42, 0x4228, 0b1010...">
          </div>
          <div class="bits-row">
            <span class="bits-label">Binary</span>
            <span class="bits-value" id="bits-${id}">${renderEmptyBits()}</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="value-row">
        <div class="input-row">
          <label>Value</label>
          <input type="text" id="input-${id}" value="${p.decimalValue}">
        </div>
        <div class="decimal-value">${p.decimalValue}</div>
        <div class="bits-row">
          <span class="bits-label">Sign</span>
          <span class="bits-value">${renderBit(p.sign, "sign")}</span>
        </div>
        <div class="bits-row">
          <span class="bits-label">Exponent</span>
          <span class="bits-value">${renderBit(p.hiddenBit, "hidden")}${renderBitString(p.binary.slice(2, 2 + exponentBits()), "exponent")}</span>
        </div>
        <div class="bits-row">
          <span class="bits-label">Significand</span>
          <span class="bits-value">${renderBitString(p.binary.slice(2 + exponentBits()), "significand")}</span>
        </div>
        <div class="breakdown">
          <div class="breakdown-item">
            <span class="breakdown-label">Sign:</span>
            <span class="breakdown-value sign">${p.signOut}${p.sign}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Exp:</span>
            <span class="breakdown-value exponent">${p.expOut}</span>
          </div>
        </div>
        <div class="output-row">
          <span>${p.hex}</span>
          <span>${p.binary}</span>
        </div>
      </div>
    `;
  }

  function renderResultRow(r) {
    if (r.nan) {
      return `<div class="value-row result"><div class="decimal-value">NaN</div><div class="bits-row"><span class="bits-label">Sign</span><span class="bits-value">${renderBit("1", "sign")}</span></div></div>`;
    }
    if (r.inf) {
      return `<div class="value-row result"><div class="decimal-value">${r.decimalValue}</div><div class="bits-row"><span class="bits-label">Sign</span><span class="bits-value">${renderBit(r.sign, "sign")}</span></div></div>`;
    }
    return `
      <div class="value-row result">
        <div class="decimal-value">${r.decimalValue}</div>
        <div class="bits-row">
          <span class="bits-label">Sign</span>
          <span class="bits-value">${renderBit(r.sign, "sign")}</span>
        </div>
        <div class="bits-row">
          <span class="bits-label">Exponent</span>
          <span class="bits-value">${renderBit(r.hiddenBit, "hidden")}${renderBitString(r.binary.slice(2, 2 + exponentBits()), "exponent")}</span>
        </div>
        <div class="bits-row">
          <span class="bits-label">Significand</span>
          <span class="bits-value">${renderBitString(r.binary.slice(2 + exponentBits()), "significand")}</span>
        </div>
        <div class="breakdown">
          <div class="breakdown-item">
            <span class="breakdown-label">Sign:</span>
            <span class="breakdown-value sign">${r.signOut}${r.sign}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Exp:</span>
            <span class="breakdown-value exponent">${r.expOut}</span>
          </div>
        </div>
        <div class="output-row">
          <span>${r.hex}</span>
          <span>${r.binary}</span>
        </div>
      </div>
    `;
  }

  function renderEmptyResult() {
    return `<div class="value-row result"><div class="decimal-value" style="color:#808080">Select an operation</div></div>`;
  }

  function renderBit(bit, cls) {
    return `<span class="bit ${cls}">${bit}</span>`;
  }

  function renderBitString(str, cls) {
    return str.split("").map((b) => `<span class="bit ${cls}">${b}</span>`).join("");
  }

  function renderEmptyBits() {
    return `<span class="bit hidden">?</span>`.repeat(8);
  }

  function exponentBits() {
    const map = { 16: 5, 32: 8, 64: 11, 128: 15 };
    return map[state.format] || 11;
  }

  function bindEvents() {
    document.querySelectorAll(".format-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.format = parseInt(btn.dataset.format);
        vscode.postMessage({ type: "switchFormat", payload: { format: state.format } });
        if (state.a.value) {
          vscode.postMessage({ type: "inputChanged", payload: { row: "a", value: state.a.value, format: state.format } });
        }
        if (state.b.value) {
          vscode.postMessage({ type: "inputChanged", payload: { row: "b", value: state.b.value, format: state.format } });
        }
        render();
      });
    });

    ["a", "b"].forEach((id) => {
      const input = document.getElementById(`input-${id}`);
      if (input) {
        input.addEventListener("change", () => {
          state[id].value = input.value;
          vscode.postMessage({
            type: "inputChanged",
            payload: { row: id, value: input.value, format: state.format },
          });
        });
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            state[id].value = input.value;
            vscode.postMessage({
              type: "inputChanged",
              payload: { row: id, value: input.value, format: state.format },
            });
          }
        });
      }
    });

    document.querySelectorAll(".arith-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.a.parsed && state.b.parsed) {
          vscode.postMessage({
            type: "calculate",
            payload: {
              op: btn.dataset.op,
              a: state.a.parsed,
              b: state.b.parsed,
              format: state.format,
            },
          });
        }
      });
    });
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "updateParsed":
        state[message.payload.row].parsed = message.payload;
        render();
        break;
      case "updateResult":
        state.result = message.payload;
        render();
        break;
    }
  });

  render();
})();
