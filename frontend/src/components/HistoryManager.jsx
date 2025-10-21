// frontend/src/components/HistoryManager.jsx
export default function HistoryManager() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center px-6 pt-4">
        <h2 className="text-2xl font-bold text-gray-800">📜 History</h2>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Under Development</h3>
          <p className="text-gray-600">
            This section will display audit logs, activity history, and system events for tracking changes and user actions.
          </p>
        </div>
      </div>
    </div>
  );
}
