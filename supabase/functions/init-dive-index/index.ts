import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Checking if dive manual index needs initialization...");

    // Create supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if chunks exist
    const { count, error: countError } = await supabase
      .from("document_chunks")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("Error checking chunks:", countError);
      throw countError;
    }

    console.log(`Found ${count} chunks in database`);

    if (count && count > 0) {
      return new Response(
        JSON.stringify({
          seeded: false,
          chunks: count,
          message: "Index already populated - no action needed",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // No chunks exist, trigger batch ingestion
    console.log("No chunks found, triggering batch ingestion...");

    const TOTAL_PAGES = 991; // Navy Diving Manual Rev 7
    const PAGES_PER_BATCH = 150;
    const batches: Array<{ start: number; end: number }> = [];
    
    for (let start = 1; start <= TOTAL_PAGES; start += PAGES_PER_BATCH) {
      const end = Math.min(start + PAGES_PER_BATCH - 1, TOTAL_PAGES);
      batches.push({ start, end });
    }

    console.log(`Processing ${batches.length} batches of ~${PAGES_PER_BATCH} pages each`);

    let totalChunksCreated = 0;
    let documentId = "";

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`Processing batch ${i + 1}/${batches.length}: pages ${batch.start}-${batch.end}`);

      const ingestResponse = await supabase.functions.invoke("ingest-dive-manual", {
        body: { startPage: batch.start, endPage: batch.end },
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`
        }
      });

      if (ingestResponse.error) {
        console.error(`Batch ${i + 1} error:`, ingestResponse.error);
        throw new Error(`Batch ${i + 1} failed: ${ingestResponse.error.message}`);
      }

      const batchData = ingestResponse.data;
      totalChunksCreated += batchData.chunksCreated || 0;
      documentId = batchData.documentId || documentId;
      
      console.log(`Batch ${i + 1} complete: ${batchData.chunksCreated} chunks created`);
    }

    console.log(`All batches complete: ${totalChunksCreated} total chunks created`);

    return new Response(
      JSON.stringify({
        seeded: true,
        chunks: totalChunksCreated,
        batches: batches.length,
        documentId: documentId,
        message: `Index successfully populated from Navy Diving Manual (${batches.length} batches)`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Init error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        seeded: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
