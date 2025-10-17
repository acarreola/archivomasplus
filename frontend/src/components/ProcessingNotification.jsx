import { useLanguage } from '../context/LanguageContext';

function ProcessingNotification({ comerciales }) {
  const { t } = useLanguage();

  // Accept both Spanish and English status codes
  const processingVideos = comerciales.filter(c => 
    c.estado_transcodificacion === 'PROCESANDO' ||
    c.estado_transcodificacion === 'PENDIENTE' ||
    c.estado_transcodificacion === 'PROCESSING' || 
    c.estado_transcodificacion === 'PENDING'
  );

  if (processingVideos.length === 0) return null;

  const getStatusIcon = (estado) => {
    const normalized = estado === 'PROCESANDO' ? 'PROCESSING' : (estado === 'PENDIENTE' ? 'PENDING' : estado);
    switch (estado) {
      case 'PENDING':
      case 'PENDIENTE':
        return '⏳';
      case 'PROCESSING':
      case 'PROCESANDO':
        return '🔄';
      default:
        return '📹';
    }
  };

  const getStatusText = (estado) => {
    const normalized = estado === 'PROCESANDO' ? 'PROCESSING' : (estado === 'PENDIENTE' ? 'PENDING' : estado);
    switch (normalized) {
      case 'PENDING':
        return 'In queue...';
      case 'PROCESSING':
        return 'Processing...';
      default:
        return 'Working...';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-500 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span className="font-semibold">
              {processingVideos.length} {processingVideos.length === 1 ? 'video processing' : 'videos processing'}
            </span>
          </div>
        </div>

        {/* Videos List */}
        <div className="max-h-64 overflow-y-auto bg-gray-50">
          {processingVideos.map((comercial) => (
            <div 
              key={comercial.id}
              className="px-4 py-3 border-b border-gray-200 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {/* Status Icon with Animation */}
                <div className="flex-shrink-0 text-2xl">
                  <span className={(comercial.estado_transcodificacion === 'PROCESSING' || comercial.estado_transcodificacion === 'PROCESANDO') ? 'animate-pulse' : ''}>
                    {getStatusIcon(comercial.estado_transcodificacion)}
                  </span>
                </div>

                {/* Video Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {comercial.pizarra?.producto || comercial.repositorio_nombre || 'Untitled video'}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs font-semibold ${
                      (comercial.estado_transcodificacion === 'PROCESSING' || comercial.estado_transcodificacion === 'PROCESANDO') 
                        ? 'text-blue-600' 
                        : 'text-gray-500'
                    }`}>
                      {getStatusText(comercial.estado_transcodificacion)}
                    </span>
                    {(comercial.estado_transcodificacion === 'PROCESSING' || comercial.estado_transcodificacion === 'PROCESANDO') && (
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer with Cancel Button */}
        <div className="bg-blue-50 px-4 py-3 space-y-2">
          <p className="text-xs text-blue-700 text-center">⚡ Updates automatically every 5 seconds</p>
          {processingVideos.length > 0 && (
            <button
              onClick={async () => {
                if (window.confirm(`Cancel ${processingVideos.length} stuck ${processingVideos.length === 1 ? 'process' : 'processes'}? They will be marked as FAILED.`)) {
                  try {
                    const response = await fetch('http://localhost:8000/api/broadcasts/cancel_all_processing/', {
                      method: 'POST',
                      credentials: 'include',
                    });
                    const data = await response.json();
                    alert(`✅ ${data.updated_count} processes cancelled`);
                    window.location.reload();
                  } catch (err) {
                    alert(`Error: ${err.message}`);
                  }
                }
              }}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel All Stuck Processes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProcessingNotification;
