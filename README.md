# Peritimo

Crie um aplicativo web funcional chamado PERITMO (nome exato, não Clario), subtítulo "Gestão inteligente de reuniões". Plataforma interna de agenda e CRM leve para uma agência comercial que agenda cerca de 20 reuniões por semana. Foque numa primeira versão real, elegante, segura e com baixo desperdício de créditos.

IDENTIDADE: SaaS premium dark mode, fundo #0B1020, cards #171C30, violeta #8B5CF6, lilás #A78BFA, branco #F8FAFC; tipografia Inter, ícones Lucide, interface limpa sem poluição, desktop e mobile. Logo textual PERITMO com ícone de calendário minimalista.

ENTREGAS:
1) Autenticação real usando backend Lovable Cloud/Supabase conforme disponível: login e-mail/senha, recuperação de senha por e-mail e redefinição por link, alterar senha em Minha Conta, logout, sessão persistente e proteção das rotas. Não incluir credenciais fixas. Cadastro de usuários sob controle de administrador; prever ativação segura da primeira conta de administrador sem permitir autoelevação de privilégio.
2) Dashboard: reuniões hoje, semana, confirmadas, realizadas, não comparecimentos, propostas enviadas, fechadas e taxa de comparecimento/conversão, filtros por período, segmento e responsável; gráfico semanal e próximos agendamentos. Usar dados reais, mostrar empty states se vazio.
3) Calendário diário, semanal e mensal; agendamentos clicáveis e criação rápida, indicar conflitos de horário por responsável; fuso America/Cuiaba.
4) Reuniões: CRUD real com nome lead, telefone WhatsApp, Instagram, empresa, segmento, cidade, data, horário, duração, origem, SDR/responsável, valor potencial, observações, próxima ação. Status: Agendada, Confirmada, Realizada, Não compareceu, Reagendar, Proposta enviada, Fechado, Perdido. Histórico de alterações relevante. Busca e filtros.
5) Kanban por status com atualização persistente ao mover cartões.
6) Equipe: administrador pode gerenciar responsáveis e usuários; SDR acompanha suas próprias reuniões. Aplicar regras de autorização no banco (RLS), não apenas esconder botões.
7) Biblioteca de scripts de confirmação, lembrete, não comparecimento, follow-up e proposta; interpolação de nome/data/hora; botão copiar e abrir WhatsApp via wa.me, sem APIs pagas.
8) Configurações: dados da conta, alterar senha, segmentos, sair.

DADOS: entidades profiles, meetings, segments, meeting_activity, message_templates com integridade e RLS; preservar isolamento de dados. Registrar eventos e campos suficientes para métricas corretas; reuniões futuras não entram na taxa de comparecimento. Validar formulários, loading, erros e empty states. Português brasileiro. Sem integrar Google Calendar, mensagens automáticas, IA ou pagamento nesta fase. Evitar dados simulados apresentados como reais. Priorize que login, dados e CRUD funcionem de ponta a ponta; não apenas mockup. Se alguma configuração externa depender de ativação, avisar claramente. Testar fluxos essenciais e deixar pronto para publicar, mas não publicar automaticamente.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://peritimo.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b1024aa1-51f7-402f-bc96-a838f4365ad8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
