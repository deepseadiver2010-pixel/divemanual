-- Allow users to delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add cascade delete for chat_messages to auto-delete messages when conversation is deleted
ALTER TABLE public.chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_conversation_id_fkey,
ADD CONSTRAINT chat_messages_conversation_id_fkey 
  FOREIGN KEY (conversation_id) 
  REFERENCES public.conversations(id) 
  ON DELETE CASCADE;