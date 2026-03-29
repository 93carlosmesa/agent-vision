/**
 * toolStatusMapper — Converts Claude Code tool names + inputs into human-readable labels.
 *
 * Pure function, no side effects. Used by ClaudeWatcher to produce
 * meaningful status strings for the frontend.
 */

/** Extract filename from a path (avoids Node path import for browser compat) */
function getBasename(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  return idx >= 0 ? filePath.slice(idx + 1) : filePath;
}

/**
 * Format a tool name and its input into a short, readable status label.
 */
export function formatToolStatus(toolName: string, input: Record<string, unknown>): string {
  const filePath = typeof input.file_path === 'string' ? input.file_path : '';
  const fileName = filePath ? getBasename(filePath) : '';

  switch (toolName) {
    case 'Read':
      return fileName ? `Leyendo ${fileName}` : 'Leyendo archivo';

    case 'Write':
      return fileName ? `Escribiendo ${fileName}` : 'Escribiendo archivo';

    case 'Edit':
      return fileName ? `Editando ${fileName}` : 'Editando archivo';

    case 'Bash': {
      const cmd = typeof input.command === 'string' ? input.command : '';
      return cmd ? `Ejecutando: ${cmd.slice(0, 60)}` : 'Ejecutando comando';
    }

    case 'Glob':
      return 'Buscando archivos';

    case 'Grep':
      return 'Buscando en código';

    case 'WebFetch':
      return 'Consultando web';

    case 'WebSearch':
      return 'Buscando en web';

    case 'Task':
    case 'Agent': {
      const desc = typeof input.description === 'string' ? input.description : '';
      return desc ? `Subagente: ${desc.slice(0, 40)}` : 'Iniciando subagente';
    }

    case 'AskUserQuestion':
      return 'Esperando tu respuesta';

    case 'EnterPlanMode':
      return 'Planificando';

    case 'TodoWrite':
      return 'Actualizando tareas';

    case 'NotebookEdit':
      return 'Editando notebook';

    case 'Skill':
      return typeof input.skill === 'string' ? `Skill: ${input.skill}` : 'Ejecutando skill';

    default:
      // Handle MCP-style tool names and sessions_* tools
      if (toolName === 'sessions_spawn') {
        const task = typeof input.task === 'string' ? input.task : '';
        return task ? `Delegando: ${task.slice(0, 40)}` : 'Delegando tarea';
      }
      if (toolName === 'sessions_send') {
        return 'Enviando mensaje';
      }
      if (toolName.startsWith('mcp__')) {
        const parts = toolName.split('__');
        const shortName = parts.length > 2 ? parts[parts.length - 1] : toolName;
        return `MCP: ${shortName}`;
      }
      return `Usando ${toolName}`;
  }
}
