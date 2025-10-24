-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Rename tables to match VA pattern (if they don't already exist with new names)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions') THEN
    ALTER TABLE chat_sessions RENAME TO conversations;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chunks') THEN
    ALTER TABLE chunks RENAME TO document_chunks;
  END IF;
END $$;

-- Add missing columns to document_chunks
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS seq INTEGER,
ADD COLUMN IF NOT EXISTS section_label TEXT,
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Rename content column to text if needed
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_chunks' AND column_name = 'content') THEN
    ALTER TABLE document_chunks RENAME COLUMN content TO text;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_seq ON document_chunks(seq);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_page ON document_chunks(page_number);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_hash ON document_chunks(content_hash);

-- Update chat_messages foreign key to reference conversations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'session_id') THEN
    ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_session_id_fkey;
    ALTER TABLE chat_messages RENAME COLUMN session_id TO conversation_id;
  END IF;
END $$;

ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_conversation_id_fkey,
ADD CONSTRAINT chat_messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Enable Realtime for chat_messages
DO $$ BEGIN
  EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- Create or replace match_dive_chunks RPC
CREATE OR REPLACE FUNCTION match_dive_chunks(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.20,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  document_id uuid,
  document_title text,
  section_label text,
  text text,
  page_number int,
  volume text,
  chapter text,
  similarity double precision
)
LANGUAGE sql STABLE AS $$
  SELECT 
    d.id as document_id,
    d.title as document_title,
    dc.section_label,
    dc.text,
    dc.page_number,
    dc.volume,
    dc.chapter,
    1 - (dc.embedding <=> query_embedding) as similarity
  FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE dc.embedding IS NOT NULL
    AND (1 - (dc.embedding <=> query_embedding)) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count
$$;

-- Update RLS policies to use new table names
DROP POLICY IF EXISTS "Users can manage own chat sessions" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
CREATE POLICY "Users see own conversations"
  ON conversations FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own conversations" ON conversations;
CREATE POLICY "Users insert own conversations"
  ON conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert into own sessions" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON chat_messages;

CREATE POLICY "Users see messages in own conversations"
  ON chat_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = chat_messages.conversation_id 
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users insert messages in own conversations"
  ON chat_messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = chat_messages.conversation_id 
      AND c.user_id = auth.uid()
    )
  );