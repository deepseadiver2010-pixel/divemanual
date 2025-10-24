import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// @ts-ignore - PDF.js types not available in Deno
import * as pdfjsLib from 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/+esm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: roleCheck } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { bucketName = 'manuals', filePath = 'navy-diving-manual.pdf' } = await req.json();

    console.log('Starting PDF processing...', { bucketName, filePath });

    // Download PDF from Supabase Storage using SDK
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (downloadError) {
      console.error('Storage download error:', downloadError);
      throw new Error(`Failed to download PDF from storage: ${downloadError.message}`);
    }

    const pdfArrayBuffer = await pdfData.arrayBuffer();
    console.log(`PDF downloaded: ${pdfArrayBuffer.byteLength} bytes`);

    // Parse PDF with pdf.js
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
    const numPages = pdfDoc.numPages;
    console.log(`PDF has ${numPages} pages`);

    // Extract text from all pages
    let fullText = '';
    const pageTexts: Array<{ pageNum: number; text: string }> = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      pageTexts.push({ pageNum, text: pageText });
      fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
      
      if (pageNum % 50 === 0) {
        console.log(`Extracted text from ${pageNum}/${numPages} pages`);
      }
    }

    console.log(`Text extraction complete: ${fullText.length} characters`);

    // Get or create document record
    const { data: existingDoc } = await supabase
      .from('documents')
      .select('id')
      .eq('title', 'U.S. Navy Diving Manual')
      .single();

    let documentId: string;
    if (existingDoc) {
      documentId = existingDoc.id;
      console.log('Using existing document:', documentId);
    } else {
      const { data: newDoc, error: docError } = await supabase
        .from('documents')
        .insert({
          title: 'U.S. Navy Diving Manual',
          description: 'Official U.S. Navy Diving Manual Revision 7',
          version: 'Revision 7',
          file_url: `${bucketName}/${filePath}`,
          total_pages: numPages,
          is_published: true,
          published_at: new Date().toISOString(),
          uploaded_by: user.id
        })
        .select('id')
        .single();

      if (docError) throw docError;
      documentId = newDoc.id;
      console.log('Created new document:', documentId);
    }

    // Clear existing chunks for this document
    await supabase.from('document_chunks').delete().eq('document_id', documentId);
    console.log('Cleared existing chunks');

    // Process text into chunks
    const chunks = chunkText(fullText, pageTexts, documentId);
    console.log(`Created ${chunks.length} chunks`);

    // Process chunks in batches with embeddings
    const batchSize = 10;
    let processedCount = 0;
    let failedEmbeddings = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      // Generate embeddings for batch with error handling
      const embeddings = await Promise.all(
        batch.map(async (chunk) => {
          try {
            return await generateEmbedding(chunk.text, openaiApiKey);
          } catch (error) {
            console.error(`Failed to generate embedding for chunk ${i}:`, error);
            failedEmbeddings++;
            return null; // Will be stored without embedding for full-text search fallback
          }
        })
      );

      // Prepare chunks with embeddings
      const chunksWithEmbeddings = batch.map((chunk, idx) => ({
        ...chunk,
        embedding: embeddings[idx]
      }));

      // Insert batch
      const { error: insertError } = await supabase
        .from('document_chunks')
        .insert(chunksWithEmbeddings);

      if (insertError) {
        console.error('Error inserting batch:', insertError);
        throw insertError;
      }

      processedCount += batch.length;
      console.log(`Processed ${processedCount}/${chunks.length} chunks (${Math.round(processedCount/chunks.length*100)}%)`);
    }

    const response = {
      success: true,
      message: `Processed ${chunks.length} chunks from ${numPages} pages`,
      documentId,
      chunksCreated: chunks.length,
      failedEmbeddings,
      totalPages: numPages
    };

    console.log('Processing complete:', response);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing PDF:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function chunkText(
  fullText: string,
  pageTexts: Array<{ pageNum: number; text: string }>,
  documentId: string
) {
  const chunks = [];
  const lines = fullText.split('\n');
  
  let currentChunk = '';
  let currentVolume = 'Unknown';
  let currentChapter = 'Unknown';
  let currentSection = '';
  let pageNumber = 1;
  let warningFlags: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Track page numbers from markers
    const pageMatch = trimmed.match(/^---\s*Page\s+(\d+)\s*---$/);
    if (pageMatch) {
      pageNumber = parseInt(pageMatch[1]);
      continue;
    }
    
    // Detect volume
    if (trimmed.match(/^VOLUME\s+[IVX\d]+/i)) {
      currentVolume = trimmed;
    }
    
    // Detect chapter
    if (trimmed.match(/^CHAPTER\s+\d+/i)) {
      currentChapter = trimmed;
    }
    
    // Detect section
    if (trimmed.match(/^\d+[-\.]\d+/)) {
      currentSection = trimmed;
    }

    // Detect warnings
    const tempFlags: string[] = [];
    if (trimmed.includes('WARNING')) tempFlags.push('WARNING');
    if (trimmed.includes('CAUTION')) tempFlags.push('CAUTION');
    if (trimmed.includes('NOTE')) tempFlags.push('NOTE');
    if (tempFlags.length > 0) warningFlags = tempFlags;

    currentChunk += line + '\n';

    // Create chunk when it reaches ~500 tokens (roughly 2000 chars)
    if (currentChunk.length > 2000) {
      chunks.push({
        document_id: documentId,
        text: currentChunk.trim(),
        volume: currentVolume,
        chapter: currentChapter,
        section_label: currentSection || null,
        page_number: pageNumber,
        warning_flags: warningFlags.length > 0 ? warningFlags : null,
        token_count: Math.ceil(currentChunk.length / 4)
      });
      
      currentChunk = '';
      warningFlags = [];
    }
  }

  // Add remaining text
  if (currentChunk.trim()) {
    chunks.push({
      document_id: documentId,
      text: currentChunk.trim(),
      volume: currentVolume,
      chapter: currentChapter,
      section_label: currentSection || null,
      page_number: pageNumber,
      warning_flags: warningFlags.length > 0 ? warningFlags : null,
      token_count: Math.ceil(currentChunk.length / 4)
    });
  }

  return chunks;
}

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000) // Limit to 8k chars
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI embeddings error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key. Please update your credentials.');
    }
    
    throw new Error(`Failed to generate embedding: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}
