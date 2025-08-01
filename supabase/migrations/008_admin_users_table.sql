-- Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES public.admin_users(id),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Add indexes for performance
CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_admin_users_role_active ON public.admin_users(role) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read their own record
CREATE POLICY "Users can read own admin record" ON public.admin_users
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Allow admin role users to read all records
CREATE POLICY "Admins can read all records" ON public.admin_users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- RLS Policy: Allow admin role users to insert records
CREATE POLICY "Admins can insert records" ON public.admin_users
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- RLS Policy: Allow admin role users to update records
CREATE POLICY "Admins can update records" ON public.admin_users
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- RLS Policy: Allow admin role users to delete records
CREATE POLICY "Admins can delete records" ON public.admin_users
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON public.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment on table
COMMENT ON TABLE public.admin_users IS 'Stores admin and staff user records for the spa booking system';

-- Add comments on columns
COMMENT ON COLUMN public.admin_users.id IS 'Primary key';
COMMENT ON COLUMN public.admin_users.user_id IS 'Reference to auth.users table';
COMMENT ON COLUMN public.admin_users.email IS 'User email address';
COMMENT ON COLUMN public.admin_users.role IS 'User role: admin or staff';
COMMENT ON COLUMN public.admin_users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN public.admin_users.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN public.admin_users.updated_at IS 'Timestamp when the record was last updated';
COMMENT ON COLUMN public.admin_users.created_by IS 'Reference to the admin user who created this record';
COMMENT ON COLUMN public.admin_users.last_login IS 'Timestamp of the user''s last login';