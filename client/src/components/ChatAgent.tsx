import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Bot, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatData {
  headers: string[];
  rows: (string | number | null)[][];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  data?: ChatData;
  suggestions?: string[];
  pending?: boolean;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: "Hello! I'm your Kinto ERP assistant. Ask me anything about your sales, inventory, production, finances, or operations.",
  suggestions: ["Total outstanding", "Today's sales", "Low stock items", "Pending POs", "Help"],
};

function renderText(text: string) {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

function DataTable({ data }: { data: ChatData }) {
  return (
    <div className="mt-2 overflow-x-auto rounded-md border border-border text-xs">
      <table className="min-w-full">
        <thead>
          <tr className="bg-muted/60">
            {data.headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-foreground whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-background" : "bg-muted/20"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{cell ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MessageBubble({ msg, onSuggestion }: { msg: Message; onSuggestion: (s: string) => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-2 mb-3", isUser && "flex-row-reverse")}>
      <div className={cn(
        "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
      )}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div className={cn("max-w-[82%] flex flex-col gap-1", isUser && "items-end")}>
        <div className={cn(
          "rounded-2xl px-3 py-2 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        )}>
          {msg.pending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <p className="whitespace-pre-wrap">{renderText(msg.text)}</p>
          }
        </div>
        {msg.data && <DataTable data={msg.data} />}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {msg.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestion(s)}
                data-testid={`suggestion-chip-${i}`}
                className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary hover-elevate border border-primary/20 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatAgent() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (message: string) =>
      apiRequest("POST", "/api/chat", { message }).then(r => r.json()),
    onSuccess: (data, vars) => {
      setMessages(prev => {
        const withoutPending = prev.filter(m => !m.pending);
        return [...withoutPending, {
          id: Date.now().toString(),
          role: "assistant",
          text: data.text,
          data: data.data,
          suggestions: data.suggestions,
        }];
      });
    },
    onError: () => {
      setMessages(prev => {
        const withoutPending = prev.filter(m => !m.pending);
        return [...withoutPending, {
          id: Date.now().toString(),
          role: "assistant",
          text: "Sorry, something went wrong. Please try again.",
        }];
      });
    },
  });

  const sendMessage = (text: string) => {
    if (!text.trim() || mutation.isPending) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    const pendingMsg: Message = { id: "pending", role: "assistant", text: "", pending: true };
    setMessages(prev => [...prev, userMsg, pendingMsg]);
    setInput("");
    mutation.mutate(text.trim());
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        {!open && (
          <button
            onClick={() => setOpen(true)}
            data-testid="button-open-chat"
            className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover-elevate active-elevate-2 transition-transform"
            aria-label="Open ERP Assistant"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-[9999] w-[380px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl shadow-2xl border border-border bg-background overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <p className="text-sm font-semibold leading-none">Kinto ERP Assistant</p>
                <p className="text-xs opacity-75 mt-0.5">80 intents · local · instant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
                data-testid="button-close-chat"
                className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setMessages([WELCOME]); setOpen(false); }}
                data-testid="button-clear-chat"
                className="text-primary-foreground hover:bg-primary-foreground/20 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-3 py-3">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onSuggestion={text => sendMessage(text)}
              />
            ))}
            <div ref={bottomRef} />
          </ScrollArea>

          {/* Input */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-border flex-shrink-0 bg-background">
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about sales, stock, production…"
              data-testid="input-chat-message"
              className="flex-1 text-sm"
              disabled={mutation.isPending}
            />
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || mutation.isPending}
              data-testid="button-send-chat"
            >
              {mutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
