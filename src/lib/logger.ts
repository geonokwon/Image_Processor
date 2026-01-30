import { LogMessage } from '@/types';

class Logger {
  private logLevel: string;

  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  private log(level: LogMessage['level'], message: string, data?: any) {
    const logMessage: LogMessage = {
      level,
      message,
      timestamp: new Date().toISOString(),
      data,
    };

    const logString = `[${logMessage.timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (level === 'error') {
      console.error(logString, data || '');
    } else if (level === 'warn') {
      console.warn(logString, data || '');
    } else {
      console.log(logString, data || '');
    }
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }
}

export const logger = new Logger();

