const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const sendBtn = document.getElementById("send-btn");
const clearBtn = document.getElementById("clear-btn");
const statusLed = document.getElementById("status-led");
const initTimeEl = document.getElementById("init-time");

const messages = [];

function formatClock() {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

if (initTimeEl) {
  initTimeEl.textContent = formatClock();
}

function addMessage(text, sender) {
  const message = document.createElement("article");
  message.classList.add("message", sender);

  const meta = document.createElement("div");
  meta.classList.add("msg-meta");

  const senderLabel = document.createElement("span");
  senderLabel.classList.add("msg-sender");
  senderLabel.textContent = sender === "user" ? "ANDA" : "ASISTEN";

  const timeLabel = document.createElement("span");
  timeLabel.classList.add("msg-time");
  timeLabel.textContent = formatClock();

  meta.appendChild(senderLabel);
  meta.appendChild(timeLabel);

  const content = document.createElement("div");
  content.classList.add("message-content");
  content.textContent = text;

  message.appendChild(meta);
  message.appendChild(content);
  chatBox.appendChild(message);
  chatBox.scrollTop = chatBox.scrollHeight;

  return content;
}

userInput.addEventListener("input", () => {
  userInput.style.height = "auto";
  userInput.style.height = `${Math.min(userInput.scrollHeight, 130)}px`;
});

userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = userInput.value.trim();

  if (!message) {
    return;
  }

  addMessage(message, "user");

  messages.push({
    role: "user",
    content: message
  });

  userInput.value = "";
  userInput.style.height = "auto";

  userInput.disabled = true;
  sendBtn.disabled = true;
  sendBtn.querySelector("span").textContent = "Menunggu...";
  statusLed.classList.add("busy");

  const botContent = addMessage("...", "bot");
  let botResponse = "";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: messages
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Terjadi kesalahan");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine || !trimmedLine.startsWith("data:")) {
          continue;
        }

        const data = trimmedLine.slice(5).trim();

        if (data === "[DONE]") {
          continue;
        }

        try {
          const token = JSON.parse(data);
          botResponse += token;
          botContent.textContent = botResponse;
          chatBox.scrollTop = chatBox.scrollHeight;
        } catch (error) {
          console.error("Gagal membaca token:", error);
        }
      }
    }

    messages.push({
      role: "assistant",
      content: botResponse
    });
  } catch (error) {
    console.error(error);
    messages.pop();
    botContent.parentElement.classList.add("error");
    botContent.textContent = "Maaf, terjadi kesalahan: " + error.message;
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    sendBtn.querySelector("span").textContent = "Kirim";
    statusLed.classList.remove("busy");
    userInput.focus();
  }
});

clearBtn.addEventListener("click", () => {
  messages.length = 0;
  chatBox.innerHTML = "";
  addMessage("Sesi percakapan telah diatur ulang. Silakan mulai pertanyaan baru.", "bot");
});