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
        .from('conversations')
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
        conversation_id: currentSessionId,
        role: 'user',
        content: message
      });
      
    if (messageError) throw messageError;

    // Get conversation history (last 10 messages only)
    const { data: messages, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', currentSessionId)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (historyError) throw historyError;

    // Reverse to get chronological order
    const conversationHistory = (messages || []).reverse();

    // Get LOVABLE_API_KEY from environment
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate embedding for semantic search
    const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: message.substring(0, 8000)
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`Failed to generate embedding: ${embeddingResponse.status}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    // Perform semantic search on chunks using RPC
    const { data: chunks, error: searchError } = await supabase.rpc('match_dive_chunks', {
      query_embedding: embedding,
      match_threshold: 0.20,
      match_count: 5
    });
      
    if (searchError) throw searchError;

    // Build context from retrieved chunks
    const context = chunks?.map((chunk: any) => 
      `${chunk.volume || 'Unknown'} - ${chunk.chapter || 'Unknown'} - Page ${chunk.page_number}:\n${chunk.text}`
    ).join('\n\n') || "";

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
          ...conversationHistory.map(msg => ({ role: msg.role, content: msg.content }))
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limits exceeded, please try again later.",
            errorType: "rate_limit" 
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Payment required, please add funds to your Lovable AI workspace.",
            errorType: "payment_required" 
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            error: "Please sign in again.",
            errorType: "unauthorized" 
          }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: "Something went wrong. Please try again.",
          errorType: "server_error" 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices[0].message.content;

    // Extract citations from chunks and format them (VA app format)
    const citations = chunks?.map((chunk: any) => ({
      document_id: chunk.document_id,
      document_title: chunk.document_title || `${chunk.volume} - ${chunk.chapter}`,
      snippet: chunk.text?.substring(0, 200) || "",
      section_label: chunk.section_label || null,
      page_number: chunk.page_number,
      volume: chunk.volume,
      chapter: chunk.chapter
    })) || [];

    // Save AI response
    const { error: aiMessageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: currentSessionId,
        role: 'assistant',
        content: aiResponse,
        citations: citations
      });
      
    if (aiMessageError) throw aiMessageError;

    // Auto-title generation after first exchange
    const { count: messageCount } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', currentSessionId);

    if (messageCount === 2) {
      try {
        const titlePrompt = `Based on this conversation, create a short 3-5 word title:
User: ${message}
Assistant: ${aiResponse}

Title (no quotes, no punctuation):`;

        const titleResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: titlePrompt }],
            temperature: 0.7,
            max_tokens: 20,
          }),
        });

        if (titleResponse.ok) {
          const titleData = await titleResponse.json();
          const generatedTitle = titleData.choices[0].message.content.trim();
          
          await supabase
            .from('conversations')
            .update({ title: generatedTitle })
            .eq('id', currentSessionId);

          console.log("Auto-generated title:", generatedTitle);
        }
      } catch (titleError) {
        console.error("Title generation error (non-fatal):", titleError);
      }
    }

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