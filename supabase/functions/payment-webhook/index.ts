import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PaymentWebhookPayload {
  user_email: string;
  user_name: string;
  user_phone?: string;
  amount: number;
  currency?: string;
  payment_method: 'pix' | 'credit_card' | 'boleto' | 'debit_card';
  payment_provider: 'stripe' | 'mercadopago' | 'pagseguro' | 'manual';
  provider_transaction_id?: string;
  plan_type: 'monthly' | 'yearly' | 'lifetime';
  metadata?: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: PaymentWebhookPayload = await req.json();

    console.log('Payment webhook received:', payload);

    // Validar dados obrigatórios
    if (!payload.user_email || !payload.user_name || !payload.amount || !payload.plan_type) {
      return new Response(
        JSON.stringify({ error: 'Dados incompletos: user_email, user_name, amount e plan_type são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 1. Verificar se usuário existe, senão criar
    let userId: string;
    
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userFound = existingUser?.users.find(u => u.email === payload.user_email);

    if (userFound) {
      userId = userFound.id;
      console.log('Usuário existente encontrado:', userId);
    } else {
      // Criar novo usuário com senha aleatória
      const randomPassword = crypto.randomUUID();
      
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: payload.user_email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          full_name: payload.user_name,
          phone: payload.user_phone || '',
        }
      });

      if (createError || !newUser.user) {
        console.error('Erro ao criar usuário:', createError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário', details: createError }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      userId = newUser.user.id;
      console.log('Novo usuário criado:', userId);

      // Enviar email de redefinição de senha
      const { error: resetError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: payload.user_email,
      });

      if (resetError) {
        console.error('Erro ao gerar link de recuperação:', resetError);
      }
    }

    // 2. Calcular data de expiração
    let expiresAt: string | null = null;
    const startedAt = new Date().toISOString();

    if (payload.plan_type === 'monthly') {
      const expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      expiresAt = expires.toISOString();
    } else if (payload.plan_type === 'yearly') {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      expiresAt = expires.toISOString();
    }
    // lifetime = null (sem expiração)

    // 3. Criar assinatura
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        status: 'active',
        plan_type: payload.plan_type,
        started_at: startedAt,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (subError) {
      console.error('Erro ao criar assinatura:', subError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar assinatura', details: subError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Assinatura criada:', subscription);

    // 4. Registrar transação
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        amount: payload.amount,
        currency: payload.currency || 'BRL',
        payment_method: payload.payment_method,
        payment_provider: payload.payment_provider,
        provider_transaction_id: payload.provider_transaction_id || null,
        status: 'completed',
        metadata: payload.metadata || {},
      })
      .select()
      .single();

    if (txError) {
      console.error('Erro ao registrar transação:', txError);
    }

    console.log('Transação registrada:', transaction);

    // 5. Resposta de sucesso
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Acesso liberado com sucesso!',
        data: {
          user_id: userId,
          subscription_id: subscription.id,
          transaction_id: transaction?.id,
          email: payload.user_email,
          plan_type: payload.plan_type,
          expires_at: expiresAt,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Erro no webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
