// Webhook intermediário: Kirvano → Supabase
export async function handler(event, context) {
  console.log('=== WEBHOOK KIRVANO RECEBIDO ===');
  console.log('Método:', event.httpMethod);
  console.log('Body:', event.body);

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método não permitido. Use POST.' })
    };
  }

  try {
    const dadosKirvano = JSON.parse(event.body);
    console.log('Dados da Kirvano:', JSON.stringify(dadosKirvano, null, 2));

    // Extrair dados da Kirvano (adaptável para diferentes formatos)
    const email = 
      dadosKirvano.email || 
      dadosKirvano.customer_email || 
      dadosKirvano.buyer_email ||
      dadosKirvano.user_email;

    const nome = 
      dadosKirvano.name || 
      dadosKirvano.customer_name ||
      dadosKirvano.buyer_name ||
      dadosKirvano.user_name;

    const telefone = 
      dadosKirvano.phone || 
      dadosKirvano.customer_phone ||
      dadosKirvano.buyer_phone ||
      dadosKirvano.user_phone;

    const valor = 
      dadosKirvano.amount || 
      dadosKirvano.value ||
      dadosKirvano.price ||
      dadosKirvano.total ||
      0;

    const transacaoId = 
      dadosKirvano.transaction_id ||
      dadosKirvano.payment_id ||
      dadosKirvano.order_id ||
      dadosKirvano.id;

    const status = 
      dadosKirvano.status || 
      dadosKirvano.payment_status ||
      '';

    console.log('Dados extraídos:', { email, nome, telefone, valor, status });

    // Validar email obrigatório
    if (!email) {
      console.error('Email não encontrado nos dados');
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: 'Email do comprador não encontrado',
          dados_recebidos: dadosKirvano 
        })
      };
    }

    // Verificar se pagamento foi aprovado
    const statusAprovados = ['paid', 'approved', 'completed', 'success', 'pago', 'aprovado'];
    const statusLower = status.toLowerCase();
    
    if (!statusAprovados.some(s => statusLower.includes(s))) {
      console.log('Pagamento ainda não aprovado:', status);
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          message: 'Aguardando aprovação do pagamento',
          status: status 
        })
      };
    }

    // Preparar payload para o webhook do Supabase
    const payloadSupabase = {
      user_email: email,
      user_name: nome || 'Cliente',
      user_phone: telefone || null,
      amount: parseFloat(valor) || 0,
      currency: 'BRL',
      payment_method: dadosKirvano.payment_method || 'pix',
      payment_provider: 'kirvano',
      provider_transaction_id: transacaoId || null,
      plan_type: 'lifetime', // Acesso vitalício
      metadata: {
        kirvano_data: dadosKirvano,
        processed_at: new Date().toISOString()
      }
    };

    console.log('Enviando para Supabase:', JSON.stringify(payloadSupabase, null, 2));

    // Chamar o webhook do Supabase
    const supabaseResponse = await fetch(
      'https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadSupabase)
      }
    );

    const supabaseResult = await supabaseResponse.json();
    console.log('Resposta do Supabase:', supabaseResult);

    if (!supabaseResponse.ok) {
      throw new Error(`Erro do Supabase: ${JSON.stringify(supabaseResult)}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Acesso liberado com sucesso!',
        email: email,
        supabase_response: supabaseResult
      })
    };

  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Erro ao processar pagamento',
        details: error.message,
        stack: error.stack
      })
    };
  }
}
