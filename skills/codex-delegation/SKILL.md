# Codex Delegation - Brain & Muscle Pattern

## Filosofía

**Yo soy el cerebro. Codex es el músculo.**

- Yo: planifico, diseño, coordino, verifico, comunico
- Codex: escribe el código, implementa, ejecuta tareas técnicas

## Cuándo delegar a Codex

SIEMPRE que haya código que escribir:
- Crear nuevos archivos/proyectos
- Implementar features
- Refactorizar código existente
- Arreglar bugs
- Escribir tests
- Generar boilerplate

## Cuándo NO delegar

- Decisiones de arquitectura (yo decido, Codex implementa)
- Comunicación con el usuario
- Lectura/análisis de archivos pequeños
- Ediciones quirúrgicas simples (1-2 líneas)
- Comandos de shell simples

## Patrón de Delegación

```bash
# 1. Preparar el directorio
mkdir -p ~/clawd/tools/[proyecto]
cd ~/clawd/tools/[proyecto]
git init

# 2. Delegar a Codex con prompt claro
bash pty:true workdir:~/clawd/tools/[proyecto] background:true command:"codex --yolo exec '[PROMPT DETALLADO]

Requisitos:
- [requisito 1]
- [requisito 2]

Cuando termines, ejecuta: clawdbot gateway wake --text \"Done: [resumen]\" --mode now'"

# 3. Monitorear progreso
process action:log sessionId:XXX

# 4. Verificar resultado cuando termine
# 5. Comunicar al usuario
```

## Prompt Engineering para Codex

Dar contexto claro:
- Qué construir (objetivo)
- Cómo debe funcionar (comportamiento)
- Qué tecnología usar (stack)
- Dónde poner los archivos (estructura)
- Cómo verificar que funciona (tests/ejemplos)

## Reglas

1. **No microgestionar** - dar el objetivo, dejar que Codex resuelva
2. **Verificar siempre** - ejecutar el código antes de reportar éxito
3. **Iterar si falla** - si Codex falla, dar más contexto y reintentar
4. **Yo soy responsable** - el resultado final es mi responsabilidad

---
Creado: 2026-01-28
