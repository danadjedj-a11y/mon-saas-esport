// Système de logging centralisé

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

const LOG_LEVEL_NAMES = {
  [LOG_LEVELS.DEBUG]: 'DEBUG',
  [LOG_LEVELS.INFO]: 'INFO',
  [LOG_LEVELS.WARN]: 'WARN',
  [LOG_LEVELS.ERROR]: 'ERROR'
};

class Logger {
  constructor() {
    // Déterminer le niveau de log selon l'environnement
    this.logLevel = process.env.NODE_ENV === 'production' 
      ? LOG_LEVELS.WARN 
      : LOG_LEVELS.DEBUG;
    
    this.logs = [];
    this.maxLogs = 100; // Garder seulement les 100 derniers logs en mémoire
  }

  setLogLevel(level) {
    this.logLevel = level;
  }

  formatMessage(level, message, data) {
    const timestamp = new Date().toISOString();
    const levelName = LOG_LEVEL_NAMES[level];
    return {
      timestamp,
      level: levelName,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined
    };
  }

  log(level, message, data) {
    if (level < this.logLevel) {
      return;
    }

    const logEntry = this.formatMessage(level, message, data);
    
    // Stocker dans le tableau (pour debugging)
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Retirer les plus anciens
    }

    // Afficher dans la console avec le format approprié
    const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' :
                         level === LOG_LEVELS.WARN ? 'warn' :
                         level === LOG_LEVELS.INFO ? 'info' :
                         'log';

    if (data) {
      console[consoleMethod](`[${logEntry.level}] ${message}`, data);
    } else {
      console[consoleMethod](`[${logEntry.level}] ${message}`);
    }

    // En production, on pourrait envoyer les erreurs à un service externe
    if (process.env.NODE_ENV === 'production' && level >= LOG_LEVELS.ERROR) {
      this.sendToExternalService(logEntry);
    }
  }

  sendToExternalService(logEntry) {
    // Ici, vous pourriez envoyer à Sentry, LogRocket, ou votre propre API
    // Example:
    // if (window.Sentry) {
    //   window.Sentry.captureMessage(logEntry.message, {
    //     level: logEntry.level.toLowerCase(),
    //     extra: logEntry.data
    //   });
    // }
    
    // Pour l'instant, on ne fait rien
    // Mais cette méthode est prête pour une intégration future
  }

  debug(message, data) {
    this.log(LOG_LEVELS.DEBUG, message, data);
  }

  info(message, data) {
    this.log(LOG_LEVELS.INFO, message, data);
  }

  warn(message, data) {
    this.log(LOG_LEVELS.WARN, message, data);
  }

  error(message, error) {
    // Pour les erreurs, on extrait plus d'infos si c'est un Error object
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;

    this.log(LOG_LEVELS.ERROR, message, errorData);
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  // Méthode pour exporter les logs (utile pour le debugging)
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Instance singleton
const logger = new Logger();

export default logger;

