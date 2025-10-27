import { useState } from "react";
import { askDiveManual } from "../lib/chatManual";

const Index = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  async function handleSend() {
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");

    try {
      const data = await askDiveManual(q);
      setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: data.answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: "Error contacting Supabase function." }]);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <p className="inline-block rounded-xl px-4 py-2 bg-muted">{m.content}</p>
          </div>
        ))}
      </div>

      <div className="p-4 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the Dive Manual..."
          className="flex-1 border rounded-lg px-4 py-2 bg-background"
        />
        <button onClick={handleSend} className="bg-primary text-primary-foreground px-4 rounded-lg">
          Send
        </button>
      </div>
    </div>
  );
};

export default Index;
