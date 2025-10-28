import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Save user message with robust fallback if conversation ID is invalid
    let triedRecoverFromMissingConversation = false;
    const insertUserMessage = async () => {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentSessionId,
          role: 'user',
          content: message
        });
      return error;
    };

    let userMsgError = await insertUserMessage();

    // If the provided conversation_id doesn't exist (FK violation), create one and retry once
    if (userMsgError && (userMsgError as any).code === '23503') {
      console.warn('⚠️ conversation_id missing, creating a new conversation and retrying.');
      triedRecoverFromMissingConversation = true;
      const { data: newSession, error: convCreateError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        })
        .select()
        .single();
      if (convCreateError) throw convCreateError;
      currentSessionId = newSession.id;
      userMsgError = await insertUserMessage();
    }

    if (userMsgError) throw userMsgError;

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

    // Get API keys from environment
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate embedding for semantic search using OpenAI
    // Include recent conversation context for better follow-up question understanding
    const recentMessages = conversationHistory?.slice(-4) || []; // Last 4 messages (2 exchanges) - null-safe
    const contextualQuery = recentMessages.length > 0
      ? `${recentMessages.map(m => m.content).join(' ')} ${message}`.substring(0, 8000)
      : message.substring(0, 8000);

    console.log(`🔍 Generating embedding for query (${contextualQuery.length} chars)`);

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: contextualQuery
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("❌ OpenAI embeddings error:", embeddingResponse.status, errorText);
      
      // Return structured error for client handling
      return new Response(
        JSON.stringify({ 
          error: `Failed to generate embedding: ${embeddingResponse.status}`,
          errorType: 'embedding_error',
          details: errorText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;
    console.log(`✅ Embedding generated (${embedding.length} dimensions)`);

    // === ENHANCED MULTI-STRATEGY SEARCH ===
    
    // Step 1: Extract keywords and phrases from query
    const extractKeywords = (query: string): string[] => {
      const stopWords = ['what', 'is', 'are', 'the', 'a', 'an', 'how', 'why', 'when', 'where', 'can', 'do', 'does', 'could', 'would', 'should'];
      const words = query.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.includes(w));
      return words;
    };

    const keywords = extractKeywords(message);
    const phrases: string[] = [];
    
    // Extract quoted phrases
    const quotedPhrases = message.match(/"([^"]+)"/g);
    if (quotedPhrases) {
      phrases.push(...quotedPhrases.map((p: string) => p.replace(/"/g, '').toLowerCase()));
    }
    
    // Add full query as a phrase (cleaned)
    const cleanQuery = message.toLowerCase().replace(/[?!.,;]/g, '').trim();
    if (cleanQuery.length > 5 && !phrases.includes(cleanQuery)) {
      phrases.push(cleanQuery);
    }

    console.log(`🔍 Extracted keywords: [${keywords.join(', ')}]`);
    console.log(`📝 Extracted phrases: [${phrases.join(', ')}]`);

    // Step 2: Run semantic and keyword searches in parallel
    console.log(`🔎 Running parallel searches: semantic (threshold 0.08, limit 20) + keyword (limit 15)`);
    
    const [semanticResult, keywordResult] = await Promise.all([
      // Semantic search with wider net
      supabase.rpc('match_dive_chunks', {
        query_embedding: embedding,
        match_threshold: 0.08,
        match_count: 20
      }),
      
      // Enhanced keyword search
      (async () => {
        if (keywords.length === 0) return { data: [], error: null };
        
        // Build OR query for all keywords
        const orConditions = keywords.map(kw => `text.ilike.%${kw}%`).join(',');
        return await supabase
          .from('document_chunks')
          .select('id, document_id, section_label, text, page_number, volume, chapter')
          .or(orConditions)
          .limit(15);
      })()
    ]);

    if (semanticResult.error) {
      console.error("❌ Semantic search error:", semanticResult.error);
      throw semanticResult.error;
    }

    if (keywordResult.error) {
      console.error("❌ Keyword search error:", keywordResult.error);
    }

    console.log(`📊 Semantic results: ${semanticResult.data?.length || 0}`);
    console.log(`📊 Keyword results: ${keywordResult.data?.length || 0}`);

    // Step 3: Score, merge, and deduplicate results
    const seen = new Set<string>();
    const scoredChunks: any[] = [];

    // Process keyword results with scoring
    for (const chunk of keywordResult.data || []) {
      if (seen.has(chunk.id)) continue;
      seen.add(chunk.id);
      
      let score = 0;
      const lowerText = chunk.text.toLowerCase();
      
      // Exact phrase match (highest priority)
      for (const phrase of phrases) {
        if (lowerText.includes(phrase)) {
          score += 100;
          
          // Bonus if phrase appears early (likely a definition)
          const position = lowerText.indexOf(phrase);
          if (position < 500) score += 50;
          if (position < 200) score += 25; // Extra bonus for very early appearance
        }
      }
      
      // Individual keyword matches
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        score += matches * 5;
      }
      
      scoredChunks.push({ ...chunk, score, source: 'keyword' });
    }

    // Process semantic results
    for (const chunk of semanticResult.data || []) {
      if (seen.has(chunk.id)) continue;
      seen.add(chunk.id);
      
      // Normalize similarity to comparable scale (0-100)
      const score = (chunk.similarity || 0) * 50;
      
      scoredChunks.push({ 
        ...chunk, 
        score, 
        source: 'semantic',
        similarity: chunk.similarity 
      });
    }

    // Sort by score (highest first) and take top 12
    scoredChunks.sort((a, b) => b.score - a.score);
    const finalChunks = scoredChunks.slice(0, 12);

    console.log(`🎯 Final chunks after deduplication: ${finalChunks.length}`);
    if (finalChunks.length > 0) {
      console.log(`   Top result: score=${finalChunks[0].score.toFixed(2)}, source=${finalChunks[0].source}, volume=${finalChunks[0].volume || 'N/A'}`);
    }

    // Step 4: Build context with smart window extraction for exact matches
    const buildFocusedContext = (chunks: any[], searchPhrases: string[]) => {
      return chunks.map((chunk: any) => {
        let contextText = chunk.text;
        
        // If this chunk contains an exact phrase match, extract a focused window
        for (const phrase of searchPhrases) {
          const lowerText = chunk.text.toLowerCase();
          const phraseIndex = lowerText.indexOf(phrase);
          
          if (phraseIndex !== -1) {
            // Extract 800 chars before and after the phrase for focused context
            const start = Math.max(0, phraseIndex - 800);
            const end = Math.min(chunk.text.length, phraseIndex + phrase.length + 800);
            
            const prefix = start > 0 ? '...' : '';
            const suffix = end < chunk.text.length ? '...' : '';
            contextText = prefix + chunk.text.substring(start, end) + suffix;
            
            console.log(`   🎯 Extracted ${end - start} char window for phrase "${phrase}" in chunk ${chunk.id?.substring(0, 8)}`);
            break;
          }
        }
        
        return `${chunk.volume || 'Unknown'} - ${chunk.chapter || 'Unknown'} - Page ${chunk.page_number}:\n${contextText}`;
      }).join('\n\n');
    };
    
    const context = finalChunks?.length > 0 
      ? buildFocusedContext(finalChunks, phrases) 
      : "";
    
    console.log(`📝 Built context: ${context.length} characters from ${finalChunks?.length || 0} chunks`);

    // Call Lovable AI with RAG context
    const systemPrompt = `You are a Navy Diving Manual AI assistant. You must ONLY answer questions based on the provided manual content. 

CRITICAL RULES:
1. Only use information from the manual context provided below
2. Always include exact citations in this format: (Volume X, Chapter Y, Page Z)
3. When source contains WARNING/CAUTION/NOTE, highlight them prominently
4. If information is not in the provided context, say what is missing and suggest the most relevant section to check. If there is partial context, answer using it rather than saying you have no information.
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
        temperature: 0.3,
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
    const citations = (typeof finalChunks !== 'undefined' ? finalChunks : []).map((chunk: any) => ({
      document_id: chunk.document_id,
      document_title: chunk.document_title || `${chunk.volume || ''} - ${chunk.chapter || ''}` || 'Navy Diving Manual Rev 7',
      snippet: chunk.text?.substring(0, 200) || "",
      section_label: chunk.section_label || null,
      page_number: chunk.page_number,
      volume: chunk.volume,
      chapter: chunk.chapter
    }));

    // Save AI response (retry if conversation was recreated earlier)
    const insertAssistantMessage = async () => {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentSessionId,
          role: 'assistant',
          content: aiResponse,
          citations: citations
        });
      return error;
    };

    let aiMessageError = await insertAssistantMessage();
    if (aiMessageError && (aiMessageError as any).code === '23503') {
      console.warn('⚠️ assistant insert FK issue, creating conversation and retrying.');
      const { data: newSession, error: convCreateError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : '')
        })
        .select()
        .single();
      if (convCreateError) throw convCreateError;
      currentSessionId = newSession.id;
      aiMessageError = await insertAssistantMessage();
    }

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
        results_count: finalChunks?.length || 0
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