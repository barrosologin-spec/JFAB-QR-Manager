# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

## [Unreleased]

### Corrigido
- **API de Consulta DANFE:** Atualização no endpoint e formato da requisição para busca das informações da NF-e.
- **Extração de Chave NF-e:** Implementada a extração automática da chave de acesso (44 dígitos) caso o operador realize a leitura de um QR Code complexo, URL ou texto que contenha a chave embutida.
- **Peso Bruto no DANFE:** A informação de peso bruto agora é exibida apenas se constar na NF-e, removendo o cálculo aproximado/padrão que era exibido anteriormente.
- **Informações Complementares:** O rodapé de "INFORMAÇÕES COMPLEMENTARES / OBSERVAÇÕES OPERACIONAIS" agora é exibido dinamicamente apenas quando a nota fiscal possuir essas informações preenchidas, evitando blocos vazios no DANFE.
- **Referência Indefinida no Sync:** Corrigido o erro de `useRef is not defined` no módulo de sincronização em tempo real (`useSyncData.ts`).
- **Remoção de Dados Fictícios:** O gerador de PDF do DANFE agora reflete unicamente os dados reais recebidos da NF-e (Emitente, Destinatário, Transporte, Fatura, Impostos e Produtos). Todos os valores padrão ilustrativos (mock data) foram removidos.
