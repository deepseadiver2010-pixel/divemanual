import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Minimize2, X, Send, Bot, User, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    volume: string;
    chapter: string;
    page: string;
    text: string;
  }>;
  timestamp: Date;
}

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your Navy Diving Manual AI assistant. I can help you find information from the official diving manual. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const dragRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  // Auto-open on first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('navy-dive-ai-visited');
    if (!hasVisited) {
      setIsOpen(true);
      localStorage.setItem('navy-dive-ai-visited', 'true');
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

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Simulate AI response with citations
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Based on the Navy Diving Manual, decompression procedures must follow strict protocols. The standard air decompression tables provide specific ascent rates and stop requirements.',
        citations: [
          {
            volume: 'Volume 2',
            chapter: 'Chapter 9',
            page: 'Page 9-15',
            text: 'Standard Air Decompression Tables'
          },
          {
            volume: 'Volume 2', 
            chapter: 'Chapter 9',
            page: 'Page 9-23',
            text: 'Emergency Decompression Procedures'
          }
        ],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
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
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--navy-primary))] flex items-center justify-center">
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
                          <p className="text-xs font-medium text-muted-foreground">Citations:</p>
                          {message.citations.map((citation, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-background rounded border border-border"
                            >
                              <div>
                                <p className="text-xs font-medium">{citation.text}</p>
                                <p className="text-xs text-muted-foreground">
                                  {citation.volume} • {citation.chapter} • {citation.page}
                                </p>
                              </div>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {message.type === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--tactical-light))] flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
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
                />
                <Button onClick={handleSend} size="icon" variant="tactical">
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
