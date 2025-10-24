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
    console.log("Starting Navy Diving Manual ingestion...");
    
    const DIVE_MANUAL_URL = Deno.env.get("DIVE_MANUAL_URL");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!DIVE_MANUAL_URL) {
      throw new Error("DIVE_MANUAL_URL environment variable not set");
    }
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable not set");
    }

    // Download PDF
    console.log("Downloading PDF from:", DIVE_MANUAL_URL);
    const pdfResponse = await fetch(DIVE_MANUAL_URL);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to download PDF: ${pdfResponse.status}`);
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log(`Downloaded PDF: ${pdfBuffer.byteLength} bytes`);

    // Import pdf.js
    const pdfjsLib = await import("https://esm.sh/pdfjs-dist@4.10.38");
    
    // Parse PDF
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdfDoc = await loadingTask.promise;
    console.log(`PDF loaded: ${pdfDoc.numPages} pages`);

    // Extract text from all pages
    let fullText = "";
    const pageTexts: Array<{ pageNum: number; text: string }> = [];
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      
      fullText += `\n--- Page ${i} ---\n${pageText}\n`;
      pageTexts.push({ pageNum: i, text: pageText });
      
      if (i % 50 === 0) {
        console.log(`Processed ${i}/${pdfDoc.numPages} pages`);
      }
    }

    console.log(`Extracted ${fullText.length} characters of text`);

    // Create or get document record
    const { data: existingDoc } = await supabase
      .from("documents")
      .select("id")
      .eq("title", "Navy Diving Manual Rev 7")
      .single();

    let documentId: string;
    
    if (existingDoc) {
      documentId = existingDoc.id;
      console.log("Using existing document:", documentId);
    } else {
      const { data: newDoc, error: docError } = await supabase
        .from("documents")
        .insert({
          title: "Navy Diving Manual Rev 7",
          version: "7",
          description: "U.S. Navy Diving Manual Revision 7",
          file_url: DIVE_MANUAL_URL,
          is_published: true,
          published_at: new Date().toISOString(),
          total_pages: pdfDoc.numPages,
        })
        .select()
        .single();

      if (docError) throw docError;
      documentId = newDoc.id;
      console.log("Created new document:", documentId);
    }

    // Chunk the text
    console.log("Chunking text...");
    const chunks = chunkText(pageTexts);
    console.log(`Created ${chunks.length} chunks`);

    // Generate embeddings in batches
    console.log("Generating embeddings...");
    const BATCH_SIZE = 20;
    let insertedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);

      try {
        // Generate embeddings
        const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: batch.map((c) => c.text.substring(0, 8000)),
          }),
        });

        if (!embeddingResponse.ok) {
          if (embeddingResponse.status === 429) {
            console.log("Rate limited, waiting 5 seconds...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            i -= BATCH_SIZE; // Retry this batch
            continue;
          }
          throw new Error(`Embedding API error: ${embeddingResponse.status}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embeddings = embeddingData.data.map((d: any) => d.embedding);

        // Prepare chunks with embeddings
        const chunksToInsert = batch.map((chunk, idx) => ({
          document_id: documentId,
          seq: chunk.seq,
          text: chunk.text,
          page_number: chunk.page_number,
          volume: chunk.volume,
          chapter: chunk.chapter,
          section_label: chunk.section,
          content_hash: chunk.content_hash,
          embedding: embeddings[idx],
          warning_flags: chunk.warning_flags,
          metadata: { source: "Navy Diving Manual Rev 7" },
        }));

        // Check for existing chunks by hash and only insert new ones
        const { data: existingChunks } = await supabase
          .from("document_chunks")
          .select("content_hash")
          .in("content_hash", chunksToInsert.map(c => c.content_hash));

        const existingHashes = new Set(existingChunks?.map(c => c.content_hash) || []);
        const newChunks = chunksToInsert.filter(c => !existingHashes.has(c.content_hash));

        if (newChunks.length > 0) {
          const { error: insertError } = await supabase
            .from("document_chunks")
            .insert(newChunks);

          if (insertError) {
            console.error("Insert error:", insertError);
            throw insertError;
          }

          insertedCount += newChunks.length;
          console.log(`Inserted ${newChunks.length} new chunks (skipped ${chunksToInsert.length - newChunks.length} existing)`);
        } else {
          skippedCount += chunksToInsert.length;
          console.log(`Skipped ${chunksToInsert.length} existing chunks`);
        }

      } catch (error) {
        console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error);
        throw error;
      }
    }

    console.log(`Ingestion complete: ${insertedCount} inserted, ${skippedCount} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        documentId,
        totalPages: pdfDoc.numPages,
        chunksCreated: insertedCount,
        chunksSkipped: skippedCount,
        totalChunks: chunks.length,
        message: "Ingestion completed successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Ingestion error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function chunkText(pageTexts: Array<{ pageNum: number; text: string }>) {
  const chunks: Array<{
    seq: number;
    text: string;
    page_number: number;
    volume: string;
    chapter: string;
    section: string;
    warning_flags: string[];
    content_hash: string;
  }> = [];

  const TARGET_CHUNK_SIZE = 3500; // ~800-1000 tokens
  let currentChunk = "";
  let currentPage = 1;
  let volume = "";
  let chapter = "";
  let section = "";
  let warningFlags: string[] = [];

  for (const { pageNum, text } of pageTexts) {
    currentPage = pageNum;
    const lines = text.split("\n");

    for (const line of lines) {
      // Detect structural markers
      if (/VOLUME\s+[IVX]+/i.test(line)) {
        volume = line.trim();
      }
      if (/CHAPTER\s+\d+/i.test(line)) {
        chapter = line.trim();
      }
      if (/SECTION\s+\d+/i.test(line)) {
        section = line.trim();
      }

      // Detect warnings
      const lineUpper = line.toUpperCase();
      if (lineUpper.includes("WARNING")) warningFlags.push("WARNING");
      if (lineUpper.includes("CAUTION")) warningFlags.push("CAUTION");
      if (lineUpper.includes("NOTE")) warningFlags.push("NOTE");

      currentChunk += line + "\n";

      // When chunk reaches target size, save it
      if (currentChunk.length >= TARGET_CHUNK_SIZE) {
        const chunkText = currentChunk.trim();
        
        // Generate hash for idempotency
        const encoder = new TextEncoder();
        const data = encoder.encode(chunkText);
        const hashBuffer = crypto.subtle.digestSync("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        chunks.push({
          seq: chunks.length + 1,
          text: chunkText,
          page_number: currentPage,
          volume,
          chapter,
          section,
          warning_flags: [...new Set(warningFlags)],
          content_hash: hashHex,
        });

        currentChunk = "";
        warningFlags = [];
      }
    }
  }

  // Save remaining chunk
  if (currentChunk.trim().length > 0) {
    const chunkText = currentChunk.trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(chunkText);
    const hashBuffer = crypto.subtle.digestSync("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    chunks.push({
      seq: chunks.length + 1,
      text: chunkText,
      page_number: currentPage,
      volume,
      chapter,
      section,
      warning_flags: [...new Set(warningFlags)],
      content_hash: hashHex,
    });
  }

  return chunks;
}
