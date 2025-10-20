-- Create database functions for search

-- Full-text search function
CREATE OR REPLACE FUNCTION search_chunks_fulltext(
  search_query TEXT,
  match_count INT DEFAULT 10,
  volume_filter TEXT DEFAULT NULL,
  safety_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  volume TEXT,
  chapter TEXT,
  section TEXT,
  page_number INT,
  warning_flags TEXT[],
  document_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.volume,
    c.chapter,
    c.section,
    c.page_number,
    c.warning_flags,
    c.document_id,
    ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', search_query)) as similarity
  FROM chunks c
  WHERE to_tsvector('english', c.content) @@ plainto_tsquery('english', search_query)
    AND (volume_filter IS NULL OR c.volume = volume_filter)
    AND (safety_filter IS NULL OR safety_filter = ANY(c.warning_flags))
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- Semantic search function using vector embeddings
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  volume_filter TEXT DEFAULT NULL,
  safety_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  volume TEXT,
  chapter TEXT,
  section TEXT,
  page_number INT,
  warning_flags TEXT[],
  document_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.volume,
    c.chapter,
    c.section,
    c.page_number,
    c.warning_flags,
    c.document_id,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM chunks c
  WHERE 1 - (c.embedding <=> query_embedding) > match_threshold
    AND (volume_filter IS NULL OR c.volume = volume_filter)
    AND (safety_filter IS NULL OR safety_filter = ANY(c.warning_flags))
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;