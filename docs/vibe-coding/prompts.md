# 18 prompts para vibe coding

Prompts prontos para colar no **lead** (no `claude`, dentro de um projeto) quando o objetivo é
explorar rápido, prototipar e iterar livre — sem travar o fluxo com processo pesado.
Cada um exercita o agent team + o vault central de memória. Troque as partes entre `<colchetes>`.
Os prompts estão em inglês (o time opera em inglês); a **explicação de cada um está em português**:
diz **o que o prompt faz** e **como usa o time e a memória**.

> Lembrete: rode `node "<home>/.claude/memory-team/memory.mjs" enable` uma vez por projeto para
> os hooks passarem a impor a disciplina de memória ali (sem isso eles ficam fail-open, não bloqueiam).
> No vibe coding mantenha o rastro mínimo: capture só o que valeu, no fim do spurt.

---

## A. Explorar e prototipar rápido

### 1. Spike de viabilidade
> Quick feasibility spike: can we do `<idea>` in this codebase? Don't build anything production-ready. The `executor` wires the smallest end-to-end path that proves it works or fails, and reports back in 5 lines. Only if it's promising, save one `learning` note (`save learning … --agent executor --task <id>`) with what made it viable or not.

**O que faz:** otimiza para uma resposta sim/não rápida com o caminho mais curto possível; só toca a memória se o spike tiver sinal, evitando notas de lixo.

### 2. Fazer funcionar primeiro
> Make `<feature>` work first, clean later. The `executor` hacks the happy path end-to-end without worrying about structure. Keep a running scratch list of shortcuts taken; when it works, save a single `memory` note (`--task <id>`) listing those shortcuts so we know what to repay later.

**O que faz:** libera o executor para priorizar funcionamento sobre forma, mas registra a dívida assumida numa nota única — o rastro mínimo que torna o cleanup possível depois.

### 3. Scaffolding rápido
> Scaffold a throwaway prototype for `<idea>`: minimal files, no tests, no docs. The `executor` sets up the skeleton fast. Mark the prototype clearly as throwaway in a `memory` note (`--task <id>`) so nobody mistakes it for production code.

**O que faz:** monta a estrutura mínima para começar a brincar com a ideia já, e deixa explícito na memória que é descartável — para o reviewer não cobrar qualidade de produção indevidamente.

### 4. Iteração livre sobre uma ideia
> Free iteration mode on `<idea>`: the `executor` tries 2–3 variations quickly and shows them to me side by side. No memory writes between attempts — keep the flow. Once I pick one, save a `decision` note (`--task <id>`) recording the chosen variation and why the others lost.

**O que faz:** mantém o ciclo de tentativa rápido sem interrupção de memória a cada passo, e só persiste a decisão quando você escolhe — capturando o resultado, não o ruído.

### 5. Brainstorm de features
> Brainstorm mode: with me, the `researcher` and `reviewer` throw out `<N>` possible directions for `<area>`, each in one line. Debate roughly via `SendMessage`, rank them, and save the shortlist as one `memory` note (`--task <id>`) so we can revisit later without re-brainstorming.

**O que faz:** gera muitas opções rápido com crítica leve entre pares, e arquiva a shortlist como uma nota única para a próxima sessão começar do que já foi pensado.

### 6. Prova de conceito de UI
> Vibe out a UI proof of concept for `<screen/component>`. The `executor` builds something visual and clickable fast, prioritizing feel over correctness. Capture the design intent (not the code) in a `memory` note (`--task <id>`) so the look survives even if we throw the code away.

**O que faz:** foca em algo visível e tangível rapidamente, e salva a *intenção de design* na memória — o que vale preservar de um POC de UI, mesmo que o código seja jogado fora.

### 7. Explorar uma lib ou API nova
> Let's explore `<library/API>` by playing with it. The `researcher` pulls the key concepts and gotchas (`search` first in case we've used it before), the `executor` writes tiny throwaway snippets to feel out the API. Save the gotchas as a `learning` note tagged `<library>` so the next spike skips them.

**O que faz:** combina descoberta leve com experimentação prática; checa a memória antes para não repetir aprendizado e arquiva os gotchas com tag para reuso futuro.

---

## B. Iterar e capturar no fluxo

### 8. Captura periódica de decisões
> We'll vibe code `<feature>` for a while. Don't interrupt the flow, but every time we lock in a real decision, the `executor` drops a one-line `decision` note (`--task <id>`). At the end, give me the list of decisions captured.

**O que faz:** mantém o fluxo de codificação livre enquanto deposita marcadores de decisão de uma linha conforme surgem — rastro mínimo que não trava a vibe, mas evita perder o raciocínio.

### 9. Checkpoint do protótipo
> Checkpoint: pause the vibe and have the `executor` snapshot where the prototype stands — what works, what's faked, what's next — as one `memory` note (`--task <id>`). Then we keep going.

**O que faz:** cria um ponto de salvamento rápido no meio da exploração para que, se a sessão cair, dê para retomar de onde parou sem reconstruir o estado mental.

### 10. Pivotar a ideia
> We're pivoting from `<old direction>` to `<new direction>`. Before we drop the old path, the `executor` saves a short `decision` note (`--task <id>`) on why we abandoned it, so we don't accidentally retry it later. Then start fresh on the new direction.

**O que faz:** preserva o motivo de abandonar um caminho antes de pivotar — barato de fazer e impede o time de redescobrir o mesmo beco sem saída semanas depois.

### 11. Quando a vibe travar
> I'm stuck on `<problem>`. The `researcher` runs `search <problem>` and `search <related-tag>` to surface anything we already learned, then throws 3 fresh angles at it. We pick one and keep moving; if one unblocks me, save it as a `learning` note (`--task <id>`).

**O que faz:** usa a memória como primeiro recurso quando você empaca, depois gera ângulos novos; o que destravar vira aprendizado pesquisável para o próximo bloqueio parecido.

### 12. Tarefa mobile no improviso (Expo)
> Vibe a quick `<screen/feature>` in this Expo app. The `executor` checks our existing navigation/state patterns in the vault first (`search`), builds it fast, and notes any EAS/build implication as a `memory` note tagged `expo`. Skip tests for now.

**O que faz:** mantém a velocidade no mobile reaproveitando padrões já conhecidos do vault e acumula particularidades de Expo/EAS sob o projeto, mesmo num protótipo apressado.

### 13. Spike em Cloudflare Worker
> Quick spike: stand up `<endpoint/binding>` in this Worker just to see it respond. The `executor` wires the minimal route/KV path and records the binding/secret decisions as a `decision` note tagged `cloudflare` — even for a throwaway, infra choices are easy to forget.

**O que faz:** prova a ideia de infra rapidamente e captura as escolhas de binding/secret/rota, que somem da cabeça depressa mesmo em código descartável.

---

## C. Do protótipo ao código limpo

### 14. Handoff de cleanup para o executor
> The vibe prototype works. Now harden it: the `executor` turns `<prototype/path>` into clean code, following this project's conventions, paying back the shortcuts listed in our earlier `memory` notes (`search` them first). Record the cleanup decisions as a `decision` note (`--task <id>`).

**O que faz:** transforma o protótipo em código de produção usando as notas de atalhos como checklist de dívida; a nota de decisão documenta o que foi endurecido e por quê.

### 15. Revisão adversarial pós-vibe
> Before we trust this prototype, `reviewer`: review it adversarially — assume the happy-path hacks hide bugs until proven otherwise. For each finding, state the test that would expose it, message the `executor`, and record confirmed issues as `learning` notes.

**O que faz:** submete o código feito no improviso a uma passada cética focada justamente nos atalhos do happy path; problemas confirmados viram aprendizados em vez de surpresas em produção.

### 16. Decidir: descartar ou evoluir
> Decision time on `<prototype>`: the `researcher` and `reviewer` argue keep-and-evolve vs throw-away-and-rebuild via `SendMessage`, weighing the shortcuts we logged. Record the verdict as a `decision` note (`--task <id>`) with the losing option noted for the record.

**O que faz:** força uma escolha consciente entre evoluir ou refazer o protótipo, ancorada nos atalhos registrados, e preserva tanto o veredito quanto a alternativa rejeitada.

### 17. Promover o spike a feature
> Promote the `<spike>` into a real feature. The `researcher` gathers the existing patterns it should align with, the `executor` re-implements it properly with tests, and a `decision` note (`--task <id>`) explains how the final version differs from the spike and why.

**O que faz:** separa o spike exploratório da implementação séria, alinhando a versão final aos padrões do projeto e documentando a diferença entre os dois para referência futura.

### 18. Salvar o que valeu no fim
> Wrap up the vibe session: the `executor` reviews everything we tried and saves only what's worth keeping — winning decisions as `decision` notes, reusable insights as `learning` notes, all with `--task <id>`. Then the `librarian` runs `index`. Discard the rest; tell me in 5 lines what persisted.

**O que faz:** o passo de higiene de fim de sessão para vibe coding — destila a exploração caótica em poucas notas de valor e reindexa, para a memória ficar curada e não inchada de lixo.
