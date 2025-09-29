import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId } = await req.json();
    
    if (!message) {
      throw new Error("Message is required");
    }

    // Get user from auth
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get or create chat session
    let currentSessionId = sessionId;
    
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        })
        .select()
        .single();
        
      if (sessionError) throw sessionError;
      currentSessionId = newSession.id;
    }

    // Save user message
    const { error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'user',
        content: message
      });
      
    if (messageError) throw messageError;

    // Get conversation history for context
    const { data: messages, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', currentSessionId)
      .order('created_at', { ascending: true });
      
    if (historyError) throw historyError;

    // Perform semantic search on chunks
    const { data: chunks, error: searchError } = await supabase
      .from('chunks')
      .select('content, volume, chapter, page_number, warning_flags')
      .textSearch('content', message)
      .limit(5);
      
    if (searchError) throw searchError;

    // Build context from retrieved chunks
    const context = chunks?.map(chunk => 
      `${chunk.volume} - ${chunk.chapter} - Page ${chunk.page_number}:\n${chunk.content}`
    ).join('\n\n') || "";

    // Get LOVABLE_API_KEY from environment
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Call Lovable AI with RAG context
    const systemPrompt = `You are a Navy Diving Manual AI assistant. You must ONLY answer questions based on the provided manual content. 

CRITICAL RULES:
1. Only use information from the manual context provided below
2. Always include exact citations in this format: (Volume X, Chapter Y, Page Z)
3. When source contains WARNING/CAUTION/NOTE, highlight them prominently
4. If information is not in the provided context, say "I don't have information about that in the manual. Please check [suggest relevant section]"
5. Never provide information from outside the manual

Manual Context:
${context}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(msg => ({ role: msg.role, content: msg.content }))
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0].message.content;

    // Extract citations from chunks and format them
    const citations = chunks?.map(chunk => ({
      volume: chunk.volume,
      chapter: chunk.chapter,
      page: chunk.page_number.toString(),
      text: chunk.content.substring(0, 100) + "..."
    })) || [];

    // Save AI response
    const { error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: aiResponse,
        citations: citations
      });
      
    if (aiMessageError) throw aiMessageError;

    // Log the search for analytics
    await supabase
      .from('analytics_search')
      .insert({
        user_id: user.id,
        query: message,
        search_type: 'semantic',
        results_count: chunks?.length || 0
      });

    return new Response(
      JSON.stringify({ 
        response: aiResponse, 
        sessionId: currentSessionId,
        citations: citations
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});