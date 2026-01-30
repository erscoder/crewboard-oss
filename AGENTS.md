# AGENTS.md - Mission Control

Guía para agentes que trabajan con Mission Control.

## Conceptos

- **Tareas**: Unidades de trabajo asignadas a un agente
- **Proyectos**: Agrupaciones de tareas (HyperSignals, Mission Control, etc.)
- **Asignados**: Kike (humano), Harvis (coordinación), Codex (código)

## Flujo de Tareas

```
BACKLOG → TODO → IN_PROGRESS → REVIEW → DONE
```

### Estados

| Estado | Significado |
|--------|-------------|
| BACKLOG | Ideas, pendiente de priorizar |
| TODO | Listo para trabajar |
| IN_PROGRESS | Alguien está trabajando en ello |
| REVIEW | Completado, pendiente de revisión |
| DONE | Aprobado y cerrado |

### Reglas

1. **Al coger una tarea** → Moverla INMEDIATAMENTE a `IN_PROGRESS`
2. **Al terminar** → Mover a `REVIEW` y añadir comentario con resumen
3. **Si hay dudas** → Añadir comentario y asignar a Kike
4. **Bloqueos serios** → Notificar por Telegram

## Asignación de Tareas

| Tipo de trabajo | Asignar a |
|-----------------|-----------|
| Código, desarrollo, bugs, tests | **Codex** |
| Diseño UI/UX, mockups, estilos | **Peter Designer** |
| Marketing, contenido, redes | **Marta Marketing** |
| Roadmap, specs, priorización | **Alex PM** |
| Coordinación, gestión, comunicación | **Harvis** |
| Decisiones finales, revisiones | **Kike** |

**IMPORTANTE**: Asigna cada tarea al agente especializado. No mezcles responsabilidades.

## Acceso a Datos

### Consultar tareas asignadas

```bash
cd /Users/kike/clawd/projects/mission-control && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.task.findMany({
    where: { 
      assignee: { name: 'NOMBRE_AGENTE' }, 
      status: { in: ['TODO', 'IN_PROGRESS'] } 
    },
    include: { project: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log(JSON.stringify(tasks, null, 2));
  await prisma.\$disconnect();
}
main();
"
```

### Mover tarea a IN_PROGRESS

```bash
cd /Users/kike/clawd/projects/mission-control && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.task.update({
    where: { id: 'TASK_ID' },
    data: { status: 'IN_PROGRESS' }
  });
  console.log('Task moved to IN_PROGRESS');
  await prisma.\$disconnect();
}
main();
"
```

### Mover tarea a REVIEW

```bash
cd /Users/kike/clawd/projects/mission-control && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.task.update({
    where: { id: 'TASK_ID' },
    data: { status: 'REVIEW' }
  });
  console.log('Task moved to REVIEW');
  await prisma.\$disconnect();
}
main();
"
```

### Crear una tarea

```bash
cd /Users/kike/clawd/projects/mission-control && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const task = await prisma.task.create({
    data: {
      title: 'TITULO',
      description: 'DESCRIPCION',
      status: 'TODO',
      projectId: 'PROJECT_ID',
      assigneeId: 'ASSIGNEE_ID'
    }
  });
  console.log('Created:', task.id);
  await prisma.\$disconnect();
}
main();
"
```

## IDs de Referencia

### Usuarios
| Nombre | ID | Rol |
|--------|-----|-----|
| Kike | `cml0o8ikc0001qb3bet68tgye` | Humano, decisiones |
| Harvis | `cml0o8ikm0002qb3b35z3l40q` | Coordinación |
| Codex | `cml0qnbxm0000twabx77qbqoq` | Desarrollo (dev-engineer) |
| Peter Designer | `cml0qp2170001twab0hqgu3uu` | UI/UX (ui-designer) |
| Marta Marketing | `cml0qpc3f0002twabpppg3vnd` | Marketing (marketing-specialist) |
| Alex PM | `cml0r02k10000oh4btn78xsfy` | Producto (product-manager) |

### Proyectos
Consultar con:
```bash
cd /Users/kike/clawd/projects/mission-control && node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.project.findMany().then(p => { console.log(JSON.stringify(p, null, 2)); prisma.\$disconnect(); });
"
```

## Heartbeat Check

Los agentes deben verificar periódicamente si tienen tareas pendientes:

1. Consultar tareas en `TODO` o `IN_PROGRESS` asignadas a ti
2. Si hay tareas en `TODO` → Coger la primera, mover a `IN_PROGRESS`, trabajar
3. Si hay tareas en `IN_PROGRESS` → Continuar trabajando
4. Si no hay tareas → `HEARTBEAT_OK`

## Comunicación

- **Comentarios en tareas**: Para documentar progreso o pedir info
- **Telegram**: Solo para bloqueos urgentes o decisiones importantes
- **No spamear**: Evita notificaciones innecesarias

---

*Este archivo define cómo los agentes interactúan con Mission Control.*
