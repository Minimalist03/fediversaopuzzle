# Sistema de Controle de Acesso por Compra

Este documento explica como integrar o sistema de liberação automática de acesso após compra.

## Visão Geral

O sistema permite que quando um cliente comprar seu produto, ele receba automaticamente:
- Uma conta de usuário criada
- Email com link para definir senha
- Acesso liberado imediatamente ao jogo
- Assinatura ativa conforme o plano comprado

## URL do Webhook

```
https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook
```

## Como Funciona

1. **Cliente faz a compra** (Stripe, MercadoPago, PagSeguro, etc)
2. **Sistema de pagamento chama o webhook** com os dados da compra
3. **Webhook processa automaticamente**:
   - Cria usuário (se não existir)
   - Cria assinatura ativa
   - Registra transação
   - Envia email de recuperação de senha
4. **Cliente recebe email** e pode acessar o jogo imediatamente

## Payload do Webhook (JSON)

Envie um POST request com os seguintes dados:

```json
{
  "user_email": "guilherme@exemplo.com",
  "user_name": "Guilherme Silva",
  "user_phone": "+5511999999999",
  "amount": 29.90,
  "currency": "BRL",
  "payment_method": "pix",
  "payment_provider": "mercadopago",
  "provider_transaction_id": "MP123456789",
  "plan_type": "monthly",
  "metadata": {
    "coupon": "PROMO10",
    "campaign": "black-friday"
  }
}
```

### Campos Obrigatórios

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `user_email` | string | Email do comprador |
| `user_name` | string | Nome completo do comprador |
| `amount` | number | Valor pago |
| `plan_type` | string | Tipo de plano: `monthly`, `yearly` ou `lifetime` |

### Campos Opcionais

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `user_phone` | string | Telefone do comprador |
| `currency` | string | Moeda (padrão: BRL) |
| `payment_method` | string | Método: `pix`, `credit_card`, `boleto`, `debit_card` |
| `payment_provider` | string | Provedor: `stripe`, `mercadopago`, `pagseguro`, `manual` |
| `provider_transaction_id` | string | ID da transação no provedor de pagamento |
| `metadata` | object | Dados adicionais (cupons, campanhas, etc) |

## Tipos de Plano

- **`monthly`**: Assinatura mensal (expira em 30 dias)
- **`yearly`**: Assinatura anual (expira em 1 ano)
- **`lifetime`**: Acesso vitalício (nunca expira)

## Exemplo de Integração

### Com MercadoPago

```javascript
// No webhook do MercadoPago
const webhookUrl = 'https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook';

const payload = {
  user_email: payment.payer.email,
  user_name: payment.payer.name,
  user_phone: payment.payer.phone.number,
  amount: payment.transaction_amount,
  currency: payment.currency_id,
  payment_method: 'pix',
  payment_provider: 'mercadopago',
  provider_transaction_id: payment.id,
  plan_type: 'lifetime',
  metadata: {
    order_id: payment.external_reference
  }
};

await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

### Com Stripe

```javascript
// No webhook do Stripe
const webhookUrl = 'https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook';

const payload = {
  user_email: charge.billing_details.email,
  user_name: charge.billing_details.name,
  amount: charge.amount / 100,
  currency: charge.currency,
  payment_method: 'credit_card',
  payment_provider: 'stripe',
  provider_transaction_id: charge.id,
  plan_type: 'monthly',
  metadata: {
    stripe_customer_id: charge.customer
  }
};

await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

### Com PagSeguro

```javascript
// No webhook do PagSeguro
const webhookUrl = 'https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook';

const payload = {
  user_email: transaction.sender.email,
  user_name: transaction.sender.name,
  user_phone: transaction.sender.phone.areaCode + transaction.sender.phone.number,
  amount: transaction.grossAmount,
  currency: 'BRL',
  payment_method: transaction.paymentMethod.type === 1 ? 'credit_card' : 'boleto',
  payment_provider: 'pagseguro',
  provider_transaction_id: transaction.code,
  plan_type: 'yearly',
  metadata: {
    reference: transaction.reference
  }
};

await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

## Resposta do Webhook

### Sucesso (200 OK)

```json
{
  "success": true,
  "message": "Acesso liberado com sucesso!",
  "data": {
    "user_id": "uuid-do-usuario",
    "subscription_id": "uuid-da-assinatura",
    "transaction_id": "uuid-da-transacao",
    "email": "guilherme@exemplo.com",
    "plan_type": "monthly",
    "expires_at": "2025-11-30T00:00:00Z"
  }
}
```

### Erro (400/500)

```json
{
  "error": "Descrição do erro",
  "details": "Detalhes técnicos (se disponível)"
}
```

## Fluxo do Cliente

1. Cliente compra o produto
2. Sistema chama o webhook automaticamente
3. Cliente recebe email: "Redefinir Senha"
4. Cliente clica no link e define sua senha
5. Cliente faz login em: `https://seu-dominio.com/login`
6. Cliente tem acesso imediato ao jogo

## Teste Manual

Para testar, você pode fazer uma chamada manual:

```bash
curl -X POST https://zjjrpqhhehvgezgjhcgd.supabase.co/functions/v1/payment-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "teste@email.com",
    "user_name": "Teste da Silva",
    "amount": 9.90,
    "plan_type": "monthly"
  }'
```

## Gerenciamento Manual

Caso precise liberar acesso manualmente (sem pagamento automático), você pode:

1. Acessar o Supabase Dashboard
2. Ir em "Table Editor" > "subscriptions"
3. Criar registro manualmente com:
   - `user_id`: ID do usuário
   - `status`: `active`
   - `plan_type`: `monthly`, `yearly` ou `lifetime`
   - `started_at`: data atual
   - `expires_at`: data de expiração (ou NULL para lifetime)

## Segurança

- O webhook NÃO requer autenticação (é público)
- Recomenda-se validar a origem da chamada no seu sistema
- Use HTTPS sempre
- Nunca exponha as chaves de serviço do Supabase

## Suporte

Para dúvidas ou problemas:
- Email: contato@feediversao.com.br
- Logs do webhook estão disponíveis no Supabase Dashboard > Edge Functions
