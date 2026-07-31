# Checklist — impressora ESC/POS (spec 006)

## Quando precisar

Após Asaas/financeiro/LGPD estáveis. **Não bloqueia** desenvolvimento: use `PRINTER_TYPE=none`.

## Compra sugerida

- Impressora térmica 80mm ESC/POS (Epson TM-T20, Elgin i9, Bematech MP-4200 TH ou equivalente)
- Interface: Ethernet (preferível) ou USB
- Papel 80mm

## Config rede

1. IP fixo na LAN da filial (ex.: `192.168.0.50`)
2. Porta raw TCP **9100**
3. No print-agent:

```bash
PRINTER_TYPE=network
PRINTER_HOST=192.168.0.50
PRINTER_PORT=9100
PRINT_AGENT_API_BASE=https://inovagastro360.inovatitech.com.br
PRINT_AGENT_SECTOR=cozinha   # ou balcao
```

## Validação sem hardware

```bash
PRINTER_TYPE=none
npm run print-agent:dev
# Criar pedido → job pending → agent marca printed + log payload
```

## Validação com hardware

1. Pedido de teste no cardápio
2. Job em `print_jobs` status `pending`
3. Agent imprime ticket e faz `PATCH printed`
4. Falha de rede: job permanece `pending` para retry
