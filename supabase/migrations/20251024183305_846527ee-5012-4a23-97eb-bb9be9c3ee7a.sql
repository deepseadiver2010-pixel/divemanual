-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Rename tables (only if they exist with old names)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_sessions' AND table_schema = 'public') THEN
    ALTER TABLE chat_sessions RENAME TO conversations;
  END IF;
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chunks' AND table_schema = 'public') THEN
    ALTER TABLE chunks RENAME TO document_chunks;
  END IF;
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;

-- Add missing columns to document_chunks
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS seq INTEGER,
ADD COLUMN IF NOT EXISTS section_label TEXT,
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Rename content column to text if it exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_chunks' AND column_name = 'content' AND table_schema = 'public') THEN
    ALTER TABLE document_chunks RENAME COLUMN content TO text;
  END IF;
EXCEPTION WHEN undefined_column THEN
  NULL;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_doc_chunks_doc ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_seq ON document_chunks(seq);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_page ON document_chunks(page_number);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_hash ON document_chunks(content_hash);

-- Update chat_messages to reference conversations
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'session_id' AND table_schema = 'public') THEN
    ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_session_id_fkey;
    ALTER TABLE chat_messages RENAME COLUMN session_id TO conversation_id;
  END IF;
EXCEPTION WHEN undefined_column THEN
  NULL;
END $$;

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_conversation_id_fkey;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Enable Realtime
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

-- Drop all existing policies and recreate them
DROP POLICY IF EXISTS "Users can manage own chat sessions" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users see own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert into own sessions" ON chat_messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in own conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users see messages in own conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users insert messages in own conversations" ON chat_messages;

-- Create new policies
CREATE POLICY "Users see own conversations"
  ON conversations FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own conversations"
  ON conversations FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own conversations"
  ON conversations FOR UPDATE 
  USING (auth.uid() = user_id);

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