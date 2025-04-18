// Elements
const loginScreen = document.getElementById("login-screen");
const terminalUI = document.getElementById("terminal-ui");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

const terminal = document.getElementById("terminal");
const input = document.getElementById("command");
const promptText = document.getElementById("prompt").textContent;

let terminalEnabled = false;
let history = [];
let historyIndex = -1;

// Handle Login
loginBtn.addEventListener("click", async () => {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch("/termlogin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      loginScreen.style.display = "none";
      terminalUI.style.display = "block";
      terminalEnabled = true;
      input.focus();
    } else {
      loginError.textContent = "Invalid credentials";
    }
  } catch (err) {
    loginError.textContent = "Login request failed";
  }
});

// Terminal typing output
function appendOutput(text) {
  const line = document.createElement("div");
  line.className = "terminal-line";

  const cursor = document.createElement("span");
  cursor.className = "blinking-cursor";
  cursor.textContent = "|";

  terminal.appendChild(line);
  terminal.appendChild(cursor);

  let i = 0;
  function typeChar() {
    if (i < text.length) {
      line.textContent += text.charAt(i);
      i++;
      terminal.scrollTop = terminal.scrollHeight;
      setTimeout(typeChar, 10); // Typing speed
    } else {
      terminal.removeChild(cursor); // Remove after typing
      line.innerHTML += "<br>";
    }
  }

  typeChar();
}

function clearTerminal() {
  terminal.innerHTML = "";
}

// Terminal input handling
input.addEventListener("keydown", async (e) => {
  if (!terminalEnabled) return;

  const command = input.value.trim();

  // History: Up arrow
  if (e.key === "ArrowUp") {
    e.preventDefault();
    if (history.length > 0 && historyIndex > 0) {
      historyIndex--;
      input.value = history[historyIndex];
    } else if (history.length > 0 && historyIndex === -1) {
      historyIndex = history.length - 1;
      input.value = history[historyIndex];
    }
    return;
  }

  // History: Down arrow
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (historyIndex >= 0 && historyIndex < history.length - 1) {
      historyIndex++;
      input.value = history[historyIndex];
    } else {
      historyIndex = -1;
      input.value = "";
    }
    return;
  }

  // Autocomplete: Tab key
  if (e.key === "Tab") {
    e.preventDefault();
    try {
      const res = await fetch("/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      const contentType = res.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        appendOutput(data.suggestions.join("    "));
      } else {
        const suggestion = await res.text();
        if (suggestion && suggestion !== command) {
          input.value = suggestion;
        }
      }
    } catch (err) {
      appendOutput("Autocomplete failed");
    }
    return;
  }

  // Run command: Enter key
  if (e.key === "Enter") {
    appendOutput(promptText + " " + command);
    input.value = "";

    if (command === "clear") {
      clearTerminal();
      return;
    }

    if (command === "update") {
      const updateScript = "git pull";
      try {
        const res = await fetch("/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: updateScript }),
        });
        const text = await res.text();
        appendOutput(text);
      } catch {
        appendOutput("Update failed");
      }
      return;
    }

    if (command) {
      history.push(command);
      historyIndex = -1;
    }

    try {
      const res = await fetch("/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      const text = await res.text();
      appendOutput(text);
    } catch {
      appendOutput("Error contacting server");
    }

    return;
  }
});
