
CREATE TYPE public.app_role AS ENUM ('admin', 'sdr');
CREATE TYPE public.meeting_status AS ENUM ('agendada','confirmada','realizada','nao_compareceu','reagendar','proposta_enviada','fechado','perdido');
CREATE TYPE public.template_category AS ENUM ('confirmacao','lembrete','nao_comparecimento','follow_up','proposta');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND active)
$$;

CREATE POLICY "profiles_select_team" ON public.profiles FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_delete" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND user_id <> auth.uid());

-- Non-admins cannot change active/email on their own profile
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') THEN
    NEW.active := OLD.active;
    NEW.email := OLD.email;
  END IF;
  IF auth.uid() IS NOT NULL AND NEW.id = auth.uid() AND NEW.active = false THEN
    RAISE EXCEPTION 'Você não pode desativar sua própria conta';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_profiles_protect BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), COALESCE(NEW.email,''));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- First admin bootstrap: only succeeds while no admin exists. Called only by service_role.
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(424242);
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;

-- SEGMENTS
CREATE TABLE public.segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 80),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.segments TO authenticated;
GRANT ALL ON public.segments TO service_role;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "segments_select" ON public.segments FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "segments_admin_write" ON public.segments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- MEETINGS
CREATE TABLE public.meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_name text NOT NULL CHECK (char_length(lead_name) BETWEEN 1 AND 120),
  whatsapp text CHECK (whatsapp IS NULL OR char_length(whatsapp) <= 30),
  instagram text CHECK (instagram IS NULL OR char_length(instagram) <= 60),
  company text CHECK (company IS NULL OR char_length(company) <= 120),
  segment_id uuid REFERENCES public.segments(id) ON DELETE SET NULL,
  city text CHECK (city IS NULL OR char_length(city) <= 80),
  starts_at timestamptz NOT NULL,
  duration_min integer NOT NULL DEFAULT 30 CHECK (duration_min BETWEEN 5 AND 480),
  origin text CHECK (origin IS NULL OR char_length(origin) <= 60),
  responsible_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  potential_value numeric(12,2) CHECK (potential_value IS NULL OR potential_value >= 0),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 4000),
  next_action text CHECK (next_action IS NULL OR char_length(next_action) <= 300),
  status public.meeting_status NOT NULL DEFAULT 'agendada',
  confirmed_at timestamptz,
  held_at timestamptz,
  no_show_at timestamptz,
  proposal_sent_at timestamptz,
  closed_at timestamptz,
  lost_at timestamptz,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meetings_starts_idx ON public.meetings(starts_at);
CREATE INDEX meetings_resp_idx ON public.meetings(responsible_id, starts_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings TO authenticated;
GRANT ALL ON public.meetings TO service_role;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_select" ON public.meetings FOR SELECT TO authenticated
  USING (public.is_active_user(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR responsible_id = auth.uid()));
CREATE POLICY "meetings_insert" ON public.meetings FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user(auth.uid()) AND created_by = auth.uid() AND (public.has_role(auth.uid(),'admin') OR responsible_id = auth.uid()));
CREATE POLICY "meetings_update" ON public.meetings FOR UPDATE TO authenticated
  USING (public.is_active_user(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR responsible_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR responsible_id = auth.uid());
CREATE POLICY "meetings_delete_admin" ON public.meetings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.meetings_status_timestamps()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  END IF;
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmada' AND NEW.confirmed_at IS NULL THEN NEW.confirmed_at := now(); END IF;
    IF NEW.status IN ('realizada','proposta_enviada','fechado') AND NEW.held_at IS NULL THEN NEW.held_at := now(); NEW.no_show_at := NULL; END IF;
    IF NEW.status = 'nao_compareceu' THEN NEW.no_show_at := COALESCE(NEW.no_show_at, now()); NEW.held_at := NULL; END IF;
    IF NEW.status IN ('proposta_enviada','fechado') AND NEW.proposal_sent_at IS NULL AND NEW.status = 'proposta_enviada' THEN NEW.proposal_sent_at := now(); END IF;
    IF NEW.status = 'fechado' THEN NEW.closed_at := COALESCE(NEW.closed_at, now()); NEW.lost_at := NULL; END IF;
    IF NEW.status = 'perdido' THEN NEW.lost_at := COALESCE(NEW.lost_at, now()); NEW.closed_at := NULL; END IF;
    IF NEW.status IN ('agendada','confirmada','reagendar') THEN NEW.held_at := NULL; NEW.no_show_at := NULL; NEW.closed_at := NULL; NEW.lost_at := NULL; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_meetings_ts BEFORE INSERT OR UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.meetings_status_timestamps();

-- ACTIVITY
CREATE TABLE public.meeting_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meeting_activity_meeting_idx ON public.meeting_activity(meeting_id, created_at DESC);
GRANT SELECT ON public.meeting_activity TO authenticated;
GRANT ALL ON public.meeting_activity TO service_role;
ALTER TABLE public.meeting_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_select" ON public.meeting_activity FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.meetings m WHERE m.id = meeting_id));

CREATE OR REPLACE FUNCTION public.log_meeting_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  diff jsonb := '{}'::jsonb;
  k text;
  tracked text[] := ARRAY['lead_name','whatsapp','instagram','company','segment_id','city','starts_at','duration_min','origin','responsible_id','potential_value','notes','next_action','status'];
  o jsonb; n jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.meeting_activity(meeting_id, actor_id, action, changes)
    VALUES (NEW.id, auth.uid(), 'created', jsonb_build_object('status', NEW.status, 'starts_at', NEW.starts_at));
    RETURN NEW;
  END IF;
  o := to_jsonb(OLD); n := to_jsonb(NEW);
  FOREACH k IN ARRAY tracked LOOP
    IF o->k IS DISTINCT FROM n->k THEN
      diff := diff || jsonb_build_object(k, jsonb_build_object('from', o->k, 'to', n->k));
    END IF;
  END LOOP;
  IF diff <> '{}'::jsonb THEN
    INSERT INTO public.meeting_activity(meeting_id, actor_id, action, changes)
    VALUES (NEW.id, auth.uid(), CASE WHEN diff ? 'status' THEN 'status_changed' ELSE 'updated' END, diff);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_meetings_log AFTER INSERT OR UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.log_meeting_activity();

-- TEMPLATES
CREATE TABLE public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.template_category NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_select" ON public.message_templates FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "templates_admin_write" ON public.message_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.message_templates (category, title, body) VALUES
('confirmacao','Confirmação de reunião','Olá, {nome}! Tudo bem? Passando para confirmar nossa reunião no dia {data} às {hora}. Posso confirmar sua presença?'),
('lembrete','Lembrete do dia','Oi, {nome}! Lembrando da nossa reunião hoje às {hora}. Até já!'),
('nao_comparecimento','Não comparecimento','Olá, {nome}. Sentimos sua falta na reunião de {data} às {hora}. Vamos reagendar para um horário melhor para você?'),
('follow_up','Follow-up pós-reunião','Oi, {nome}! Obrigado pela conversa de {data}. Ficou alguma dúvida? Estou à disposição para os próximos passos.'),
('proposta','Envio de proposta','Olá, {nome}! Conforme conversamos, segue a proposta para {empresa}. Fico no aguardo do seu retorno.');

INSERT INTO public.segments (name) VALUES ('Varejo'),('Serviços'),('Saúde'),('Educação'),('Alimentação');
