-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'instructor', 'user');

-- Create profiles table for user management
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role app_role NOT NULL DEFAULT 'user',
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table for Navy manual storage
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL,
    revision TEXT,
    uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    total_pages INTEGER,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create document_pages table for individual page tracking
CREATE TABLE public.document_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    page_number INTEGER NOT NULL,
    volume TEXT,
    chapter TEXT,
    section TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(document_id, page_number)
);

-- Create chunks table for RAG embedding storage
CREATE TABLE public.chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE NOT NULL,
    page_id UUID REFERENCES public.document_pages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    token_count INTEGER,
    volume TEXT,
    chapter TEXT,
    section TEXT,
    page_number INTEGER,
    warning_flags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_sessions table
CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flashcard_decks table
CREATE TABLE public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source_document_id UUID REFERENCES public.documents(id),
    source_volume TEXT,
    source_chapter TEXT,
    creation_mode TEXT CHECK (creation_mode IN ('auto', 'random', 'manual')),
    is_public BOOLEAN NOT NULL DEFAULT false,
    is_organizational BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flashcards table
CREATE TABLE public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    card_type TEXT NOT NULL DEFAULT 'qa' CHECK (card_type IN ('qa', 'term_definition', 'cloze')),
    source_page_id UUID REFERENCES public.document_pages(id),
    difficulty INTEGER DEFAULT 0,
    interval_days INTEGER DEFAULT 1,
    ease_factor DECIMAL DEFAULT 2.5,
    last_reviewed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create flashcard_reviews table for spaced repetition
CREATE TABLE public.flashcard_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES public.flashcards(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quality INTEGER NOT NULL CHECK (quality >= 0 AND quality <= 5),
    response_time_ms INTEGER,
    reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics_search table for search tracking
CREATE TABLE public.analytics_search (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    query TEXT NOT NULL,
    search_type TEXT CHECK (search_type IN ('full_text', 'semantic')),
    filters JSONB DEFAULT '{}',
    results_count INTEGER,
    clicked_result_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_log table for system events
CREATE TABLE public.event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_search ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create RLS policies

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Documents policies (only admins can upload/publish)
CREATE POLICY "Everyone can view published documents" ON public.documents
    FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage documents" ON public.documents
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Document pages policies
CREATE POLICY "Everyone can view pages of published documents" ON public.document_pages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.documents 
            WHERE id = document_id AND is_published = true
        )
    );

CREATE POLICY "Admins can manage document pages" ON public.document_pages
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Chunks policies
CREATE POLICY "Everyone can view chunks of published documents" ON public.chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.documents 
            WHERE id = document_id AND is_published = true
        )
    );

CREATE POLICY "Admins can manage chunks" ON public.chunks
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Chat sessions policies
CREATE POLICY "Users can manage own chat sessions" ON public.chat_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert into own sessions" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_sessions 
            WHERE id = session_id AND user_id = auth.uid()
        )
    );

-- Flashcard deck policies
CREATE POLICY "Users can view public and own decks" ON public.flashcard_decks
    FOR SELECT USING (
        is_public = true 
        OR auth.uid() = user_id 
        OR (is_organizational = true AND public.has_role(auth.uid(), 'instructor'))
    );

CREATE POLICY "Users can manage own decks" ON public.flashcard_decks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Instructors can create organizational decks" ON public.flashcard_decks
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        AND (NOT is_organizational OR public.has_role(auth.uid(), 'instructor'))
    );

-- Flashcards policies
CREATE POLICY "Users can view cards in accessible decks" ON public.flashcards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.flashcard_decks 
            WHERE id = deck_id 
            AND (is_public = true OR user_id = auth.uid() OR (is_organizational = true AND public.has_role(auth.uid(), 'instructor')))
        )
    );

CREATE POLICY "Deck owners can manage flashcards" ON public.flashcards
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.flashcard_decks 
            WHERE id = deck_id AND user_id = auth.uid()
        )
    );

-- Flashcard reviews policies
CREATE POLICY "Users can manage own reviews" ON public.flashcard_reviews
    FOR ALL USING (auth.uid() = user_id);

-- Analytics search policies (users can only see own data)
CREATE POLICY "Users can view own search analytics" ON public.analytics_search
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search analytics" ON public.analytics_search
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Event log policies (admins only)
CREATE POLICY "Admins can view event logs" ON public.event_log
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert event logs" ON public.event_log
    FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_documents_published ON public.documents(is_published);
CREATE INDEX idx_document_pages_document_id ON public.document_pages(document_id);
CREATE INDEX idx_chunks_document_id ON public.chunks(document_id);
CREATE INDEX idx_chunks_embedding ON public.chunks USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_flashcards_deck_id ON public.flashcards(deck_id);
CREATE INDEX idx_flashcard_reviews_card_id ON public.flashcard_reviews(card_id);
CREATE INDEX idx_flashcard_reviews_user_id ON public.flashcard_reviews(user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_flashcard_decks_updated_at
    BEFORE UPDATE ON public.flashcard_decks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name, role)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), 
        'user'
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();