/*
  # Sistema de Controle de Acesso por Compra

  1. Tabelas Criadas
    - `user_profiles` - Perfis estendidos dos usuários
      - `id` (uuid, FK para auth.users)
      - `full_name` (text) - Nome completo do usuário
      - `phone` (text) - Telefone para contato
      - `created_at` (timestamptz) - Data de criação
      - `updated_at` (timestamptz) - Data de atualização
    
    - `subscriptions` - Controle de assinaturas/acessos
      - `id` (uuid, PK) - ID único da assinatura
      - `user_id` (uuid, FK para auth.users) - Usuário dono da assinatura
      - `status` (text) - Status: 'active', 'expired', 'cancelled', 'pending'
      - `plan_type` (text) - Tipo de plano: 'monthly', 'yearly', 'lifetime'
      - `started_at` (timestamptz) - Data de início
      - `expires_at` (timestamptz) - Data de expiração (null para lifetime)
      - `created_at` (timestamptz) - Data de criação
      - `updated_at` (timestamptz) - Data de atualização
    
    - `transactions` - Histórico de transações/compras
      - `id` (uuid, PK) - ID único da transação
      - `user_id` (uuid, FK para auth.users) - Usuário que fez a compra
      - `subscription_id` (uuid, FK para subscriptions) - Assinatura relacionada
      - `amount` (numeric) - Valor pago
      - `currency` (text) - Moeda (BRL, USD, etc)
      - `payment_method` (text) - Método: 'pix', 'credit_card', 'boleto'
      - `payment_provider` (text) - Provedor: 'stripe', 'mercadopago', 'pagseguro'
      - `provider_transaction_id` (text) - ID da transação no provedor
      - `status` (text) - Status: 'pending', 'completed', 'failed', 'refunded'
      - `metadata` (jsonb) - Dados adicionais da transação
      - `created_at` (timestamptz) - Data da transação

  2. Segurança (RLS)
    - Todas as tabelas têm RLS habilitado
    - Usuários podem ler apenas seus próprios dados
    - Apenas serviço pode criar/atualizar registros de assinatura
    - Admins têm acesso total via app_metadata

  3. Funções e Triggers
    - Função para verificar se usuário tem assinatura ativa
    - Função para criar perfil automaticamente ao registrar
    - Trigger para atualizar updated_at automaticamente
*/

-- =====================================================
-- TABELA: user_profiles
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- =====================================================
-- TABELA: subscriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  plan_type text NOT NULL CHECK (plan_type IN ('monthly', 'yearly', 'lifetime')),
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON subscriptions(expires_at);

-- =====================================================
-- TABELA: transactions
-- =====================================================
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  payment_method text NOT NULL CHECK (payment_method IN ('pix', 'credit_card', 'boleto', 'debit_card')),
  payment_provider text NOT NULL CHECK (payment_provider IN ('stripe', 'mercadopago', 'pagseguro', 'manual')),
  provider_transaction_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_subscription_id ON transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_provider_transaction_id ON transactions(provider_transaction_id);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage transactions"
  ON transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para verificar se usuário tem assinatura ativa
CREATE OR REPLACE FUNCTION has_active_subscription(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE user_id = user_uuid
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'),
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
