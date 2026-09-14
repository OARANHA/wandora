# Wandora Human Experience V1

## Product promise

A customer should feel that they hired and operate a team, not that they configured an AI platform.

The default customer language is company, team, responsibility, work, conversation, approval, result, knowledge and training. Provider/runtime terms such as Mastra, Evolution, RAG, webhook, model ID, token and RLS stay outside normal customer flows.

## First-day principle

The default Wandora experience must aim for useful work on the same day a company subscribes. A long manual implementation project must not be the normal path.

The preferred journey is:

1. create or join the company;
2. state the business outcome needed;
3. hire a digital employee for that responsibility;
4. connect only the tools required for the first job;
5. provide a small amount of essential company context;
6. start in supervised mode;
7. review work, corrections and approvals;
8. increase autonomy only as policy and confidence allow.

## Product shell

The V1 customer shell uses these primary concepts:

- **Início** — what is happening now, results and what needs the owner's attention;
- **Equipe** — humans and digital employees, their responsibilities, current work and autonomy;
- **Trabalho** — active business work, not implementation workflows;
- **Conversas** — customer conversations independent of the current messaging provider;
- **Aprovações** — human decisions required before a digital employee can continue;
- **Empresa** — company data, people, knowledge, connected tools and plan.

The dashboard should answer five questions quickly: what is happening, who is working, what result was achieved, whether there is a problem, and whether the human must decide anything.

## Training instead of technical configuration

When the customer teaches a digital employee, the interface should frame that action as training or a company rule. A correction may become a proposed durable instruction only after the appropriate approval boundary.

Company truth, documents and employee experience are separate concerns. The UI should not imply that conversational memory is the canonical source for prices, permissions, schedules, contracts or other transactional facts.

## Operator visibility

Wandora may give frequently used operator tools their own HTTPS hostname for observability and support, while keeping them outside customer navigation.

An operator URL is not equivalent to an open service. Administrative surfaces should sit behind Cloudflare/Traefik and strong access control. Pure machine-to-machine components such as PostgreSQL, Redis and Docker sockets remain private and do not receive direct public management ports merely for convenience.

## Experience gate for future slices

Before implementing a new capability, answer:

- how does a paying customer reach it?
- what does the customer call it in ordinary business language?
- what must the customer click or decide?
- how quickly does it create observable value?
- does the customer depend on Wandora staff to continue?
- does the experience feel like managing an employee or configuring infrastructure?

A technically valid capability that fails this gate should be redesigned before broad implementation.
