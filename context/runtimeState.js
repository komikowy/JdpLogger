export const initialRuntimeState = {
  diagStatus: 'Gotowy',
  appErrors: [],
  packetHz: 0,
  uiHz: 0,
  dbFlushCount: 0,
  rawDroppedCount: 0,
  performanceMode: false,
};

export const runtimeReducer = (state, action) => {
  switch (action.type) {
    case 'status':
      return { ...state, diagStatus: action.value };
    case 'packetHz':
      return { ...state, packetHz: action.value };
    case 'uiHz':
      return { ...state, uiHz: action.value };
    case 'dbFlush':
      return { ...state, dbFlushCount: state.dbFlushCount + 1 };
    case 'rawDropped':
      return { ...state, rawDroppedCount: state.rawDroppedCount + (action.count || 1) };
    case 'performanceMode':
      return { ...state, performanceMode: action.enabled };
    case 'error': {
      const error = {
        type: action.errorType || 'app',
        message: action.message || 'Nieznany blad',
        timestamp: new Date().toISOString(),
      };
      return { ...state, appErrors: [error, ...state.appErrors].slice(0, 20), diagStatus: error.message };
    }
    case 'clearErrors':
      return { ...state, appErrors: [] };
    case 'clearErrorType':
      return {
        ...state,
        appErrors: state.appErrors.filter((error) => error.type !== action.errorType),
      };
    default:
      return state;
  }
};
