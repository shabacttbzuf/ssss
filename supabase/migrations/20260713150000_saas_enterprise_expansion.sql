-- Release 2.0: Multi-Tenant SaaS Platform & Enterprise Expansion

-- 1. Organizations (Top-level Entity)
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add organization_id to tenants (tenants are now restaurants/businesses within an organization)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 2. Subscription Plans
CREATE TYPE public.subscription_plan_tier AS ENUM ('basic', 'pro', 'enterprise');

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier subscription_plan_tier NOT NULL DEFAULT 'basic',
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}',
  max_branches integer NOT NULL DEFAULT 1,
  max_users integer NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Subscriptions
CREATE TYPE public.subscription_status AS ENUM ('active', 'past_due', 'canceled', 'suspended', 'trialing');

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Licenses (Per-tenant licensing)
CREATE TABLE IF NOT EXISTS public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  license_key text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Plugin Marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon_url text,
  price numeric NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT true,
  category text NOT NULL,
  metadata jsonb DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Plugin Purchases/Activations per Tenant
CREATE TABLE IF NOT EXISTS public.tenant_plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plugin_id uuid NOT NULL REFERENCES public.marketplace_plugins(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}',
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (tenant_id, plugin_id)
);

-- 6. Backup & Sync Metadata
CREATE TABLE IF NOT EXISTS public.backup_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  frequency_hours integer NOT NULL DEFAULT 24,
  last_backup_at timestamptz,
  storage_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. RLS & Permissions
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_plugins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_configs ENABLE ROW LEVEL SECURITY;

-- Policies for Organizations
CREATE POLICY "Super owners manage organizations" ON public.organizations
  FOR ALL TO authenticated USING (public.is_super_owner(auth.uid()));
CREATE POLICY "Members view their organization" ON public.organizations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.user_roles ur ON ur.tenant_id = t.id
      WHERE t.organization_id = organizations.id AND ur.user_id = auth.uid()
    )
  );

-- Policies for Subscription Plans (Public view, Super owner manage)
CREATE POLICY "View active plans" ON public.subscription_plans
  FOR SELECT TO authenticated USING (is_active = true OR public.is_super_owner(auth.uid()));
CREATE POLICY "Super owners manage plans" ON public.subscription_plans
  FOR ALL TO authenticated USING (public.is_super_owner(auth.uid()));

-- Policies for Subscriptions
CREATE POLICY "Super owners manage subscriptions" ON public.subscriptions
  FOR ALL TO authenticated USING (public.is_super_owner(auth.uid()));
CREATE POLICY "Org owners view subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.tenants t
      JOIN public.user_roles ur ON ur.tenant_id = t.id
      WHERE t.organization_id = subscriptions.organization_id 
      AND ur.user_id = auth.uid() AND ur.role = 'owner'
    )
  );

-- Update RLS for existing tables to support super owner master access
-- (Existing policies already mostly support this via public.is_super_owner)

-- 8. Triggers for updated_at
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_licenses_updated_at BEFORE UPDATE ON public.licenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_marketplace_plugins_updated_at BEFORE UPDATE ON public.marketplace_plugins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tenant_plugins_updated_at BEFORE UPDATE ON public.tenant_plugins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_backup_configs_updated_at BEFORE UPDATE ON public.backup_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Seed initial plans
INSERT INTO public.subscription_plans (name, tier, price_monthly, price_yearly, max_branches, max_users) VALUES
  ('الخطة الأساسية', 'basic', 99, 990, 1, 5),
  ('الخطة الاحترافية', 'pro', 299, 2990, 5, 20),
  ('خطة المؤسسات', 'enterprise', 999, 9990, 999, 999)
ON CONFLICT DO NOTHING;
