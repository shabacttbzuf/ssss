-- Developer Studio & Customization Layer Tables

-- Table for tenant-specific UI customizations
CREATE TABLE public.tenant_customizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  colors JSONB DEFAULT \'{}\'::jsonb, -- Stores color palette settings
  fonts JSONB DEFAULT \'{}\'::jsonb, -- Stores font settings
  logo_url TEXT, -- URL for custom logo
  favicon_url TEXT, -- URL for custom favicon
  app_title TEXT, -- Custom application title
  page_titles JSONB DEFAULT \'{}\'::jsonb, -- Custom titles for existing pages
  menu_structure JSONB DEFAULT \'[]\'::jsonb, -- Custom menu items and order
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.tenant_customizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own customizations" ON public.tenant_customizations FOR SELECT USING (tenant_id = auth.tenant_id());
CREATE POLICY "Owners can insert their own customizations" ON public.tenant_customizations FOR INSERT WITH CHECK (tenant_id = auth.tenant_id() AND auth.is_owner());
CREATE POLICY "Owners can update their own customizations" ON public.tenant_customizations FOR UPDATE USING (tenant_id = auth.tenant_id() AND auth.is_owner());

-- Table for custom pages created by the owner
CREATE TABLE public.custom_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL friendly identifier
  content TEXT, -- Markdown or HTML content for the page
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.custom_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own custom pages" ON public.custom_pages FOR SELECT USING (tenant_id = auth.tenant_id());
CREATE POLICY "Owners can insert their own custom pages" ON public.custom_pages FOR INSERT WITH CHECK (tenant_id = auth.tenant_id() AND auth.is_owner());
CREATE POLICY "Owners can update their own custom pages" ON public.custom_pages FOR UPDATE USING (tenant_id = auth.tenant_id() AND auth.is_owner());
CREATE POLICY "Owners can delete their own custom pages" ON public.custom_pages FOR DELETE USING (tenant_id = auth.tenant_id() AND auth.is_owner());

-- Table for custom actions/buttons
CREATE TABLE public.custom_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  label TEXT NOT NULL, -- Display label for the button/action
  action_type TEXT NOT NULL, -- e.g., \'navigate\', \'api_call\', \'open_modal\'
  action_payload JSONB, -- Data needed for the action (e.g., URL, API endpoint)
  location TEXT, -- Where the button/action appears (e.g., \'dashboard_header\', \'product_list_item\')
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.custom_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own custom actions" ON public.custom_actions FOR SELECT USING (tenant_id = auth.tenant_id());
CREATE POLICY "Owners can insert their own custom actions" ON public.custom_actions FOR INSERT WITH CHECK (tenant_id = auth.tenant_id() AND auth.is_owner());
CREATE POLICY "Owners can update their own custom actions" ON public.custom_actions FOR UPDATE USING (tenant_id = auth.tenant_id() AND auth.is_owner());
CREATE POLICY "Owners can delete their own custom actions" ON public.custom_actions FOR DELETE USING (tenant_id = auth.tenant_id() AND auth.is_owner());

-- Table for managing templates
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL for system-wide templates
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- e.g., \'ui_theme\', \'report_layout\', \'email_template\'
  content JSONB, -- Template content (e.g., CSS, layout structure, data schema)
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE, -- True for templates provided by the system
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (name, tenant_id) -- Ensure unique template names per tenant or globally for system templates
);
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All tenants can view system templates" ON public.templates FOR SELECT USING (is_system = TRUE);
CREATE POLICY "Tenants can view their own templates" ON public.templates FOR SELECT USING (tenant_id = auth.tenant_id());
CREATE POLICY "Owners can insert their own templates" ON public.templates FOR INSERT WITH CHECK (tenant_id = auth.tenant_id() AND auth.is_owner());
CREATE POLICY "Owners can update their own templates" ON public.templates FOR UPDATE USING (tenant_id = auth.tenant_id() AND auth.is_owner());
CREATE POLICY "Owners can delete their own templates" ON public.templates FOR DELETE USING (tenant_id = auth.tenant_id() AND auth.is_owner());

-- Table for managing plugins
CREATE TABLE public.plugins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL for system-wide plugins
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  config JSONB, -- Plugin configuration settings
  is_active BOOLEAN DEFAULT FALSE, -- Plugins are inactive by default
  is_system BOOLEAN DEFAULT FALSE, -- True for plugins provided by the system
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (name, tenant_id)
);
ALTER TABLE public.plugins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All tenants can view system plugins" ON public.plugins FOR SELECT USING (is_system = TRUE);
CREATE POLICY "Tenants can view their own plugins" ON public.plugins FOR SELECT USING (tenant_id = auth.tenant_id());
CREATE POLICY "Owners can insert their own plugins" ON public.plugins FOR INSERT WITH CHECK (tenant_id = auth.tenant_id() AND auth.is_owner());
CREATE POLICY "Owners can update their own plugins" ON public.plugins FOR UPDATE USING (tenant_id = auth.tenant_id() AND auth.is_owner());
CREATE POLICY "Owners can delete their own plugins" ON public.plugins FOR DELETE USING (tenant_id = auth.tenant_id() AND auth.is_owner());

-- Table for feature toggles (to enable/disable modules/features)
CREATE TABLE public.feature_toggles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL, -- Unique key for the feature (e.g., \'pos_module\', \'inventory_management\')
  is_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (tenant_id, feature_key)
);
ALTER TABLE public.feature_toggles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own feature toggles" ON public.feature_toggles FOR SELECT USING (tenant_id = auth.tenant_id());
CREATE POLICY "Owners can insert their own feature toggles" ON public.feature_toggles FOR INSERT WITH CHECK (tenant_id = auth.tenant_id() AND auth.is_owner());
CREATE POLICY "Owners can update their own feature toggles" ON public.feature_toggles FOR UPDATE USING (tenant_id = auth.tenant_id() AND auth.is_owner());
CREATE POLICY "Owners can delete their own feature toggles" ON public.feature_toggles FOR DELETE USING (tenant_id = auth.tenant_id() AND auth.is_owner());

-- Update `updated_at` column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language \'plpgsql\';

CREATE TRIGGER update_tenant_customizations_updated_at BEFORE UPDATE ON public.tenant_customizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_pages_updated_at BEFORE UPDATE ON public.custom_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_actions_updated_at BEFORE UPDATE ON public.custom_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plugins_updated_at BEFORE UPDATE ON public.plugins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_toggles_updated_at BEFORE UPDATE ON public.feature_toggles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
