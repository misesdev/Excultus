import { toAppError, type ErrorCode } from './AppError';

/**
 * Maps technical errors to friendly, actionable pt-BR messages.
 * Stack traces and raw messages never reach the UI.
 */
const MESSAGES: Record<ErrorCode, string> = {
  network: 'Não foi possível conectar. Verifique sua internet e tente novamente.',
  'invalid-source-url': 'Este link não é suportado. Confira o endereço e tente de novo.',
  'source-unavailable': 'O conteúdo não está disponível na fonte de origem.',
  'invalid-response':
    'A fonte respondeu de forma inesperada. Tente novamente mais tarde.',
  'unsupported-format': 'Este formato de áudio não é suportado.',
  'insufficient-storage': 'Espaço de armazenamento insuficiente no dispositivo.',
  'download-failed': 'O download falhou. Tente novamente.',
  'audio-playback': 'Não foi possível reproduzir este áudio.',
  database: 'Ocorreu um erro ao acessar seus dados locais.',
  'file-not-found': 'O arquivo local não foi encontrado. Baixe-o novamente.',
  'permission-denied': 'Permissão negada. Verifique as permissões do aplicativo.',
  validation: 'Alguns dados são inválidos. Revise e tente novamente.',
  'not-found': 'O item solicitado não foi encontrado.',
  cancelled: 'Operação cancelada.',
  unknown: 'Algo deu errado. Tente novamente.',
};

export function getUserMessage(error: unknown): string {
  const appError = toAppError(error);
  return appError.userMessage ?? MESSAGES[appError.code];
}

export function getUserMessageForCode(code: ErrorCode): string {
  return MESSAGES[code];
}
