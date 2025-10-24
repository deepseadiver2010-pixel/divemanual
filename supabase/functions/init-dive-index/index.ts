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
    console.log("Checking if dive manual index needs initialization...");

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

    // No chunks exist, trigger ingestion
    console.log("No chunks found, triggering ingestion...");

    const ingestResponse = await supabase.functions.invoke("ingest-dive-manual", {
      body: {},
    });

    if (ingestResponse.error) {
      console.error("Ingestion error:", ingestResponse.error);
      throw new Error(`Ingestion failed: ${ingestResponse.error.message}`);
    }

    const ingestData = ingestResponse.data;
    console.log("Ingestion complete:", ingestData);

    return new Response(
      JSON.stringify({
        seeded: true,
        chunks: ingestData.chunksCreated || 0,
        totalChunks: ingestData.totalChunks || 0,
        documentId: ingestData.documentId,
        message: "Index successfully populated from Navy Diving Manual",
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
