-- Add RLS policies for all tables
-- Profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Documents policies (only admins can upload/publish)
DROP POLICY IF EXISTS "Everyone can view published documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can manage documents" ON public.documents;

CREATE POLICY "Everyone can view published documents" ON public.documents
    FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage documents" ON public.documents
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Document pages policies
DROP POLICY IF EXISTS "Everyone can view pages of published documents" ON public.document_pages;
DROP POLICY IF EXISTS "Admins can manage document pages" ON public.document_pages;

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
DROP POLICY IF EXISTS "Everyone can view chunks of published documents" ON public.chunks;
DROP POLICY IF EXISTS "Admins can manage chunks" ON public.chunks;

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
DROP POLICY IF EXISTS "Users can manage own chat sessions" ON public.chat_sessions;

CREATE POLICY "Users can manage own chat sessions" ON public.chat_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Chat messages policies
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert into own sessions" ON public.chat_messages;

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
DROP POLICY IF EXISTS "Users can view public and own decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Users can manage own decks" ON public.flashcard_decks;
DROP POLICY IF EXISTS "Instructors can create organizational decks" ON public.flashcard_decks;

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
DROP POLICY IF EXISTS "Users can view cards in accessible decks" ON public.flashcards;
DROP POLICY IF EXISTS "Deck owners can manage flashcards" ON public.flashcards;

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
DROP POLICY IF EXISTS "Users can manage own reviews" ON public.flashcard_reviews;

CREATE POLICY "Users can manage own reviews" ON public.flashcard_reviews
    FOR ALL USING (auth.uid() = user_id);

-- Analytics search policies (users can only see own data)
DROP POLICY IF EXISTS "Users can view own search analytics" ON public.analytics_search;
DROP POLICY IF EXISTS "Users can insert own search analytics" ON public.analytics_search;

CREATE POLICY "Users can view own search analytics" ON public.analytics_search
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search analytics" ON public.analytics_search
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Event log policies (admins only)
DROP POLICY IF EXISTS "Admins can view event logs" ON public.event_log;
DROP POLICY IF EXISTS "System can insert event logs" ON public.event_log;

CREATE POLICY "Admins can view event logs" ON public.event_log
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert event logs" ON public.event_log
    FOR INSERT WITH CHECK (true);

-- Add triggers for updated_at if they don't exist
DO $$ 
BEGIN
    -- Check if trigger exists before creating
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at
            BEFORE UPDATE ON public.profiles
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_documents_updated_at') THEN
        CREATE TRIGGER update_documents_updated_at
            BEFORE UPDATE ON public.documents
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_chat_sessions_updated_at') THEN
        CREATE TRIGGER update_chat_sessions_updated_at
            BEFORE UPDATE ON public.chat_sessions
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_flashcard_decks_updated_at') THEN
        CREATE TRIGGER update_flashcard_decks_updated_at
            BEFORE UPDATE ON public.flashcard_decks
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Create user profile trigger if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;