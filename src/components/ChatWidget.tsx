import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Minimize2, X, Send, Bot, User, ExternalLink, Maximize } from "lucide-react";
import { cn, safeGetItem, safeSetItem } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    document_title?: string;
    snippet?: string;
    page_number?: number;
    volume?: string;
    chapter?: string;
  }>;
  timestamp: Date;
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const dragRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const { toast } = useToast();
  const navigate = useNavigate();

  // Auto-open on first visit
  useEffect(() => {
    const hasVisited = safeGetItem('navy-dive-ai-visited');
    if (!hasVisited) {
      setIsOpen(true);
      safeSetItem('navy-dive-ai-visited', 'true');
      
      // Add welcome message
      setMessages([{
        id: '1',
        type: 'assistant',
        content: 'Hello! I\'m your Navy Diving Manual AI assistant. I can help you find information from the official diving manual with exact citations. What would you like to know?',
        timestamp: new Date()
      }]);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - startPos.current.x;
      const newY = e.clientY - startPos.current.y;
      
      // Keep widget within viewport bounds
      const maxX = window.innerWidth - 400;
      const maxY = window.innerHeight - 600;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { 
          message: input,
          sessionId: sessionId
        }
      });

      if (error) {
        console.error('Chat function error:', error);
        throw new Error(error.message || 'Failed to get response');
      }

      // Check for structured errors from the function
      if (data?.errorType === 'embedding_error') {
        throw new Error('embedding_error: ' + (data.error || 'OpenAI embeddings failed'));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Update session ID if it's a new session
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response,
        citations: data.citations,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      
      // Show appropriate error message
      let errorMessage = 'I apologize, but I encountered an error. Please try again.';
      let toastTitle = 'Chat Error';
      
      if (error instanceof Error) {
        if (error.message.includes('Rate limits exceeded')) {
          errorMessage = 'I\'m currently experiencing high demand. Please try again in a moment.';
        } else if (error.message.includes('Payment required')) {
          errorMessage = 'There\'s an issue with the AI service. Please contact support.';
        } else if (error.message.includes('Unauthorized')) {
          errorMessage = 'Please sign in to use the AI assistant.';
        } else if (error.message.includes('embedding_error')) {
          toastTitle = 'OpenAI API Error';
          errorMessage = 'Failed to process your question. Please verify your OpenAI API key is valid and has sufficient credits.';
        }
      }

      const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorAiMessage]);
      
      toast({
        title: toastTitle,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 rounded-full w-14 h-14 shadow-[var(--shadow-depth)] animate-glow"
        variant="hero"
        size="icon"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <div
      ref={dragRef}
      className={cn(
        "fixed z-50 w-96 bg-card border border-border rounded-lg shadow-[var(--shadow-depth)] transition-all duration-300",
        isMinimized ? "h-14" : "h-[600px]"
      )}
      style={{ 
        left: position.x, 
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
    >
      <Card className="h-full border-0 bg-transparent">
        <CardHeader 
          className="pb-3 cursor-grab active:cursor-grabbing bg-gradient-to-r from-[hsl(var(--navy-primary))] to-[hsl(var(--navy-accent))] text-white rounded-t-lg"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Navy AI Assistant
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => navigate('/dive-buddy')}
                title="Open Full Chat"
              >
                <Maximize className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                <Minimize2 className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[calc(100%-3.5rem)]">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.type === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.type === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--navy-primary))] flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    
                    <div className={cn(
                      "max-w-[80%] rounded-lg p-3 text-sm",
                      message.type === 'user' 
                        ? "bg-[hsl(var(--navy-accent))] text-white ml-8" 
                        : "bg-muted"
                    )}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      
                      {message.citations && message.citations.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">References:</p>
                          {message.citations.map((citation, index) => (
                            <div
                              key={index}
                              className="p-2 bg-background rounded border border-border"
                            >
                              <p className="text-xs font-medium mb-1">
                                {citation.document_title || `${citation.volume} - ${citation.chapter}`}
                                {citation.page_number && ` (Page ${citation.page_number})`}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {citation.snippet}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {message.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--tactical-light))] flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-[hsl(var(--navy-primary))] flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white animate-pulse" />
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask about diving procedures..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSend} 
                  size="icon" 
                  variant="tactical"
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
};
