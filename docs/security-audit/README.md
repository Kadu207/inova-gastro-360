# Auditoria de segurança — gerador de PDF

## Regenerar

```bash
python -m venv docs/security-audit/.venv
docs/security-audit/.venv/Scripts/python -m pip install -r docs/security-audit/requirements.txt
docs/security-audit/.venv/Scripts/python docs/security-audit/generate_security_audit_pdf.py
```

Saídas:
- `relatorio-auditoria-seguranca.pdf`
- `preview-pages/page-NN.png` (validação visual)
