import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, searchType, volumeFilter, safetyFilter, page = 1, pageSize = 20 } = await req.json();
    
    if (!query) {
      throw new Error("Search query is required");
    }

    // Get user from auth
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      throw new Error("Unauthorized");
    }

    let results = [];
    let totalCount = 0;

    if (searchType === 'semantic') {
      // Semantic search using embeddings
      const { data: chunks, error: searchError } = await supabase.rpc(
        'match_chunks',
        {
          query_text: query,
          match_threshold: 0.7,
          match_count: pageSize
        }
      );

      if (searchError) throw searchError;

      results = chunks?.map((chunk: any) => ({
        id: chunk.id,
        title: `${chunk.volume} - ${chunk.chapter}`,
        volume: chunk.volume,
        chapter: chunk.chapter,
        page: chunk.page_number?.toString() || 'N/A',
        excerpt: chunk.content.substring(0, 300) + (chunk.content.length > 300 ? '...' : ''),
        type: determineContentType(chunk.warning_flags, chunk.content),
        relevanceScore: chunk.similarity || 0
      })) || [];

      totalCount = results.length;
    } else {
      // Full-text search
      let query_builder = supabase
        .from('chunks')
        .select('id, content, volume, chapter, page_number, warning_flags, document_id', { count: 'exact' })
        .textSearch('content', query, {
          type: 'websearch',
          config: 'english'
        });

      // Apply volume filter
      if (volumeFilter && volumeFilter !== 'all') {
        query_builder = query_builder.eq('volume', volumeFilter);
      }

      // Apply safety filter
      if (safetyFilter && safetyFilter !== 'all') {
        query_builder = query_builder.contains('warning_flags', [safetyFilter]);
      }

      // Pagination
      const offset = (page - 1) * pageSize;
      query_builder = query_builder.range(offset, offset + pageSize - 1);

      const { data: chunks, error: searchError, count } = await query_builder;

      if (searchError) throw searchError;

      totalCount = count || 0;
      results = chunks?.map(chunk => ({
        id: chunk.id,
        title: `${chunk.volume} - ${chunk.chapter}`,
        volume: chunk.volume,
        chapter: chunk.chapter,
        page: chunk.page_number?.toString() || 'N/A',
        excerpt: chunk.content.substring(0, 300) + (chunk.content.length > 300 ? '...' : ''),
        type: determineContentType(chunk.warning_flags, chunk.content),
        relevanceScore: 0.85 // Placeholder for full-text search
      })) || [];
    }

    // Log the search for analytics
    await supabase
      .from('analytics_search')
      .insert({
        user_id: user.id,
        query: query,
        search_type: searchType,
        results_count: results.length,
        filters: {
          volume: volumeFilter || 'all',
          safety: safetyFilter || 'all'
        }
      });

    return new Response(
      JSON.stringify({ 
        results,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function determineContentType(warningFlags: string[] | null, content: string): 'text' | 'warning' | 'caution' | 'note' {
  if (!warningFlags || warningFlags.length === 0) {
    // Check content for keywords
    const upperContent = content.toUpperCase();
    if (upperContent.includes('WARNING:')) return 'warning';
    if (upperContent.includes('CAUTION:')) return 'caution';
    if (upperContent.includes('NOTE:')) return 'note';
    return 'text';
  }
  
  if (warningFlags.includes('warning')) return 'warning';
  if (warningFlags.includes('caution')) return 'caution';
  if (warningFlags.includes('note')) return 'note';
  return 'text';
}
