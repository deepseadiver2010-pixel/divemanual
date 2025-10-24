-- Fix critical security vulnerabilities

-- 1. Create secure user_roles table (separate from profiles to prevent privilege escalation)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Migrate existing role data from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role 
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Update has_role() function to use the new secure table
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Drop the old UPDATE policy on profiles that allowed privilege escalation
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 5. Create new restricted UPDATE policy for profiles (cannot update role)
CREATE POLICY "Users can update own display name only"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Fix profiles SELECT policy - restrict to own profile or admins/instructors
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and instructors can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'instructor'::app_role));

-- 7. Fix storage bucket policy - only real admins can upload
DROP POLICY IF EXISTS "Admin upload access to manuals" ON storage.objects;

CREATE POLICY "Only admins can upload to manuals"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'manuals' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- 8. RLS policies for user_roles table
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 9. Update handle_new_user() trigger to use user_roles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert into profiles (without role)
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
    );
    
    -- Insert default 'user' role into user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user'::app_role);
    
    RETURN NEW;
END;
$$;