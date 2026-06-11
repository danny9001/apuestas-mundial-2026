# System Rule: Spec-Driven Development (SDD) via OpenSpec

As an AI coding assistant, you must STRICTLY follow the **OpenSpec / Spec-Driven Development (SDD)** methodology for all planning, queries, feature development, and bug fixes in this workspace.

**References for context:**
- https://openspec.dev/
- https://martinfowler.com/articles/structured-prompt-driven/
- https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html

## Core Philosophy
1. **Specs over Code**: Specifications are the primary artifact. The spec is the source of truth for the human and the AI.
2. **Persistent Memory**: Never rely on chat context alone. If tokens run out, context is lost, or development stops halfway, the next session must be able to continue seamlessly. Every interaction, plan, and bug fix must be recorded in persistent files.
3. **Spec-Anchored**: Specs live in the codebase (e.g., in `openspec/` or `requirements/`) and are continuously updated as the system evolves.

## Workflow Rules

### 1. Analysis & Planning (Before Coding)
Whenever tasked with a new feature, bug fix, or complex query:
- **DO NOT** start writing code immediately.
- Create a persistent plan/proposal directory (e.g., `openspec/changes/<task-name>/`).
- Create `proposal.md` to describe the business intent or bug report.
- Create `design.md` for technical decisions and root cause analysis.
- Create `tasks.md` to break down the implementation into concrete steps with checkboxes (`[ ]`).

### 2. Spec Generation and Update
- Create or update the functional specification (e.g., `openspec/specs/<domain>/spec.md`).
- Ensure the spec focuses on behavior (Given/When/Then scenarios, requirements) and not implementation details.

### 3. Execution & Task Tracking
- Execute the steps defined in `tasks.md`.
- Mark tasks as `[x]` as they are completed.
- **IMPORTANT**: If reality diverges from the initial plan, **fix the prompt/spec first**, and only then update the code. The prompt/spec must never diverge from reality.

### 4. Resumption
- When continuing an existing task, always read the corresponding `proposal.md`, `design.md`, `tasks.md`, and `spec.md` to restore full context before making new changes.

By following this SDD pattern, you ensure that every plan, query, or bug fix has persistent memory, avoiding lost context and allowing iterative development even if token limits are reached.

## Global Project Memory & Skills (AGENTE ORGANIZADOR)
- **Sistema de POS (Punto de Venta)**: `elitepass-pos`
- **Sistema de Reservas (Administrador del Club)**: `club-administrator`
- **Memoria Global de Especificaciones**: Todos los archivos de `openspec` (diseño, propuestas, tareas, specs) ahora se guardarán y leerán desde una única carpeta global compartida en `~/openspec/` (es decir, `/home/soporte/openspec/`). De esta manera, Claude y Gemini acceden exactamente al mismo directorio sin duplicar datos.

> **¡ATENCIÓN CLAUDE / GEMINI! - ENRUTAMIENTO OBLIGATORIO**
> Eres el **Agente Organizador Maestro** de Genial-it / ElitePass. Cuando vayas a trabajar en CUALQUIER módulo, DEBES leer primero el checklist y las referencias de las *skills* especializadas.
> Las skills se encuentran copiadas en `openspec/skills/` dentro de cada proyecto (`club-administrator` o `elitepass-pos`), y también en `~/.gemini/skills/skill-elite-pass-knowledge/`.
>
> 1. Lee el archivo `skill-elitepass-organizer.md`.
> 2. Según el módulo que vayas a tocar, asume la identidad correspondiente leyendo su archivo (ej. `skill-elitepass-pos-accountant.md`, `skill-elitepass-reservations-logistics.md`, etc.).
> 3. NUNCA propongas código que contradiga las reglas de seguridad, bases de datos o logística de negocio establecidas en estas skills.
