import { useState, useEffect, useRef } from "react";
import { Send, Plus, MessageCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Array<{
    volume?: string;
    chapter?: string;
    section?: string;
    page_number?: number;
    content: string;
  }>;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function DiveBuddyAI() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSessions();
  }, []);

  // Realtime subscription for conversation list updates
  useEffect(() => {
    let channel: any;

    const setupRealtimeForConversations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('conversations-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadSessions();
          }
        )
        .subscribe();
    };

    setupRealtimeForConversations();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!currentSessionId) return;

    const channel = supabase
      .channel(`messages-${currentSessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${currentSessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as any;
          const typedMessage: Message = {
            role: newMessage.role as 'user' | 'assistant',
            content: newMessage.content,
            citations: newMessage.citations as any,
          };

          setMessages((prev) => {
            if (prev.some(m => m.content === typedMessage.content && m.role === typedMessage.role)) {
              return prev;
            }
            return [...prev, typedMessage];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentSessionId]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      setSessions(data || []);
      if (data && data.length > 0 && !currentSessionId) {
        setCurrentSessionId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load chat sessions",
        variant: "destructive",
      });
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", sessionId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        citations: msg.citations as any,
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const createNewSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: "New Chat",
        })
        .select()
        .single();

      if (error) throw error;

      setSessions([data, ...sessions]);
      setCurrentSessionId(data.id);
      setMessages([]);
    } catch (error) {
      console.error("Error creating session:", error);
      toast({
        title: "Error",
        description: "Failed to create new chat session",
        variant: "destructive",
      });
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      // Update local state
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      
      // If deleted session was active, clear it or switch to another
      if (currentSessionId === sessionId) {
        const remainingSessions = sessions.filter((s) => s.id !== sessionId);
        setCurrentSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
        setMessages([]);
      }

      toast({
        title: "Success",
        description: "Chat deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const messageContent = input;
    setInput("");

    let sessionId = currentSessionId;

    // Create a new session if none exists
    if (!sessionId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            title: messageContent.substring(0, 50) + (messageContent.length > 50 ? "..." : ""),
          })
          .select()
          .single();

        if (error) throw error;
        sessionId = data.id;
        setCurrentSessionId(sessionId);
        setSessions([data, ...sessions]);
      } catch (error) {
        console.error("Error creating session:", error);
        toast({
          title: "Error",
          description: "Failed to create chat session",
          variant: "destructive",
        });
        return;
      }
    }

    // Optimistic UI update
    const userMessage: Message = { role: "user", content: messageContent };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          message: messageContent,
          sessionId: sessionId,
        },
      });

      if (error) {
        if (error.message?.includes("429")) {
          throw new Error("Rate limit exceeded. Please try again in a moment.");
        } else if (error.message?.includes("402")) {
          throw new Error("Payment required. Please add credits to your workspace.");
        } else if (error.message?.includes("401")) {
          throw new Error("Unauthorized. Please sign in again.");
        }
        throw error;
      }

      // Assistant message will arrive via realtime
      // If not received via realtime, add manually as fallback
      if (!data.error && data.response) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.response,
          citations: data.citations || [],
        };
        
        setTimeout(() => {
          setMessages((prev) => {
            if (prev.some(m => m.content === assistantMessage.content && m.role === 'assistant')) {
              return prev;
            }
            return [...prev, assistantMessage];
          });
        }, 500);
      }

      // Reload sessions to get updated title (auto-generated by backend)
      if (messages.length === 0) {
        setTimeout(() => loadSessions(), 1000);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
      // Remove the user message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loadingSessions) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--navy-accent))]" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sessions Sidebar */}
      <div className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-4 border-b border-border">
          <Button
            onClick={createNewSession}
            className="w-full bg-gradient-to-r from-[hsl(var(--navy-primary))] to-[hsl(var(--navy-accent))] hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              className={`w-full rounded-lg mb-2 p-3 transition-colors text-left ${
                currentSessionId === session.id
                  ? "bg-[hsl(var(--navy-accent)/0.1)] text-[hsl(var(--navy-accent))] border border-[hsl(var(--navy-accent)/0.3)]"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex flex-col items-center gap-1">
                  <MessageCircle className="w-4 h-4 flex-shrink-0" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="p-0.5 hover:bg-destructive/20 rounded transition-colors"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.title || "New Chat"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[hsl(var(--navy-primary))]">Dive Buddy AI</h1>
              <p className="text-sm text-muted-foreground">
                Ask me anything about the Navy Diving Manual
              </p>
            </div>
            <Button
              onClick={createNewSession}
              variant="outline"
              size="sm"
              className="md:hidden"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 && (
              <Card className="p-8 text-center border-dashed">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-[hsl(var(--navy-accent))]" />
                <h3 className="text-lg font-semibold mb-2">Welcome to Dive Buddy AI</h3>
                <p className="text-muted-foreground mb-4">
                  I'm here to help you navigate the Navy Diving Manual. Ask me about procedures,
                  safety protocols, equipment, or any diving-related topics.
                </p>
                <div className="text-sm text-left space-y-2 max-w-md mx-auto">
                  <p className="font-medium">Try asking:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>"What are the decompression tables for a 100 ft dive?"</li>
                    <li>"Explain the pre-dive safety checklist"</li>
                    <li>"What equipment is required for deep diving?"</li>
                  </ul>
                </div>
              </Card>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`max-w-[80%] p-4 ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-[hsl(var(--navy-primary))] to-[hsl(var(--navy-accent))] text-white"
                      : "bg-card"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/20">
                      <p className="text-xs font-semibold mb-2 opacity-80">References:</p>
                      <div className="space-y-2">
                        {message.citations.map((citation, citIndex) => (
                          <div
                            key={citIndex}
                            className="text-xs p-2 rounded bg-background/10 backdrop-blur-sm"
                          >
                            <div className="font-medium mb-1">
                              {citation.volume && `Vol ${citation.volume}`}
                              {citation.chapter && ` - Ch ${citation.chapter}`}
                              {citation.section && ` - Sec ${citation.section}`}
                              {citation.page_number && ` (Page ${citation.page_number})`}
                            </div>
                            <p className="opacity-80 line-clamp-2">{citation.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Searching the manual...</span>
                  </div>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t border-border bg-card p-4">
          <div className="max-w-4xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about diving procedures, safety, equipment..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-[hsl(var(--navy-primary))] to-[hsl(var(--navy-accent))] hover:opacity-90"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
