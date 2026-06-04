---
name: feedback-skill-for-modifications
description: Siempre usar el Skill tool como referencia antes de realizar cualquier modificación de código o configuración
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 72c96165-6b7f-4b40-ac4f-96a830a972f1
---

Antes de realizar cualquier modificación (código, configuración, archivos), siempre invocar la skill `skill-elitepass-organizer` como referencia.

**Why:** El usuario indicó explícitamente que toda modificación debe usar la skill `skill-elitepass-organizer` (que delega a seguridad, diseño y backend) como punto de referencia obligatorio para ElitePass.

**How to apply:** Antes de editar archivos, aplicar cambios o hacer modificaciones de cualquier tipo, invocar `Skill("skill-elitepass-organizer")` primero.
