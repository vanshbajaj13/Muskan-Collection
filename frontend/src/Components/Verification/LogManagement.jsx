import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "../Loader/Spinner";
import Toast from "../Toast/Toast";

const LogManagement = ({ sessionId, isOpen, onClose, onLogDeleted }) => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [filterAction, setFilterAction] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");
  const [toasts, setToasts] = useState([]);
  const [apiLoading, setApiLoading] = useState({
    fetch: false,
    delete: false
  });
  
  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [logToDelete, setLogToDelete] = useState(null);

  // Add toast function
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
    // eslint-disable-next-line
  }, [isOpen, sessionId]);

  const fetchLogs = async () => {
    setApiLoading(prev => ({...prev, fetch: true}));
    try {
      const response = await fetch(`/api/verification/logs/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      } else if (response.status === 401) {
        navigate("/login");
      } else {
        addToast("Failed to fetch logs", "error");
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      addToast("Error fetching logs", "error");
    } finally {
      setApiLoading(prev => ({...prev, fetch: false}));
    }
  };

  const canDeleteLog = (log) => {
    const protectedActions = ['session_start', 'session_complete'];
    return !protectedActions.includes(log.action);
  };

  const getLogActionColor = (action) => {
    const colors = {
      'scan': 'bg-green-100 text-green-800 border border-green-200',
      'manual_entry': 'bg-blue-100 text-blue-800 border border-blue-200',
      'deletion': 'bg-red-100 text-red-800 border border-red-200',
      'session_start': 'bg-purple-100 text-purple-800 border border-purple-200',
      'session_complete': 'bg-gray-100 text-gray-800 border border-gray-200',
    };
    return colors[action] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const handleOpenDeleteModal = (log) => {
    setLogToDelete(log);
    setIsDeleteModalOpen(true);
    setConfirmText("");
  };

  const handleCloseDeleteModal = () => {
    setConfirmText("");
    setIsDeleteModalOpen(false);
    setLogToDelete(null);
  };

  const handleDeleteLog = async () => {
    if (!logToDelete || confirmText.toUpperCase() !== "CONFIRM") return;
    
    setApiLoading(prev => ({...prev, delete: true}));
    try {
      const response = await fetch(`/api/verification/log/${logToDelete._id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });

      if (response.ok) {
        addToast("Log deleted successfully", "success");
        fetchLogs();
        
        if (onLogDeleted) {
          onLogDeleted();
        }
        handleCloseDeleteModal();
      } else {
        const error = await response.json();
        addToast(error.message || "Error deleting log", "error");
      }
    } catch (error) {
      console.error("Error deleting log:", error);
      addToast("Error deleting log", "error");
    } finally {
      setApiLoading(prev => ({...prev, delete: false}));
    }
  };

  const filteredLogs = logs
    .filter(log => {
      const matchesAction = filterAction === "all" || log.action === filterAction;
      const matchesSearch = !searchTerm || 
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.itemCode && log.itemCode.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesAction && matchesSearch;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        case 'action':
          aValue = a.action;
          bValue = b.action;
          break;
        case 'itemCode':
          aValue = a.itemCode || '';
          bValue = b.itemCode || '';
          break;
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

  const deletableLogs = filteredLogs.filter(log => canDeleteLog(log));
  const isDeleteEnabled = confirmText.toUpperCase() === "CONFIRM";
  const isLoadingState = Object.values(apiLoading).some(loading => loading);

  if (!isOpen) return null;

  return (
    <> 
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          />
        ))}
      </div>

      {/* Global loading overlay */}
      {isLoadingState && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <Spinner />
            <p className="mt-2 text-gray-700">
              {apiLoading.fetch && "Loading logs..."}
              {apiLoading.delete && "Deleting log..."}
            </p>
          </div>
        </div>
      )}
      
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40">
        <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-7xl shadow-lg rounded-lg bg-white">
          {/* Header */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Log Management</h3>
              <p className="text-sm text-gray-600 mt-1">
                Session: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{sessionId}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2 rounded-full hover:bg-gray-100"
            >
              ×
            </button>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <p className="text-blue-600 text-sm">Total Logs</p>
                <p className="text-2xl font-bold text-blue-700">{logs.length}</p>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <p className="text-green-600 text-sm">QR Scans</p>
                <p className="text-2xl font-bold text-green-700">
                  {logs.filter(log => log.action === 'scan').length}
                </p>
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <p className="text-blue-600 text-sm">Manual Entries</p>
                <p className="text-2xl font-bold text-blue-700">
                  {logs.filter(log => log.action === 'manual_entry').length}
                </p>
              </div>
            </div>
            
            
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between">
                <p className="text-red-600 text-sm">Deletable</p>
                <p className="text-2xl font-bold text-red-700">
                  {deletableLogs.length}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Filter by Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Action
                </label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Actions</option>
                  <option value="scan">QR Scans</option>
                  <option value="manual_entry">Manual Entries</option>
                  <option value="deletion">Deletions</option>
                  <option value="session_start">Session Start</option>
                  <option value="session_complete">Session Complete</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Logs
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search by action, details, or item code..."
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="timestamp">Timestamp</option>
                  <option value="action">Action</option>
                  <option value="itemCode">Item Code</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {filteredLogs.length} of {logs.length} logs
                {searchTerm && (
                  <span className="ml-2 text-indigo-600">
                    (filtered by "{searchTerm}")
                  </span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setFilterAction("all");
                    setSearchTerm("");
                    setSortBy("timestamp");
                    setSortOrder("desc");
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Reset Filters
                </button>
                <button
                  onClick={fetchLogs}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                  disabled={apiLoading.fetch}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Logs List */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-600 uppercase tracking-wide">
                <div className="col-span-2">Action</div>
                <div className="col-span-2">Item Code</div>
                <div className="col-span-4">Details</div>
                <div className="col-span-2">Timestamp</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {apiLoading.fetch ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📝</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
                  <p className="text-gray-600">
                    {searchTerm || filterAction !== "all" 
                      ? "Try adjusting your filters or search terms" 
                      : "No logs available for this session"
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredLogs.map((log) => (
                    <div key={log._id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Action */}
                        <div className="col-span-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getLogActionColor(log.action)}`}>
                              {log.action.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        
                        {/* Item Code */}
                        <div className="col-span-2">
                          {log.itemCode ? (
                            <span className="font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded text-sm">
                              {log.itemCode}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </div>
                        
                        {/* Details */}
                        <div className="col-span-4">
                          <p className="text-sm text-gray-700 line-clamp-2">{log.details}</p>
                          {(log.previousQuantity !== undefined || log.newQuantity !== undefined) && (
                            <p className="text-xs text-gray-500 mt-1">
                              Qty: {log.previousQuantity || 0} → {log.newQuantity || 0}
                            </p>
                          )}
                        </div>
                        
                        {/* Timestamp */}
                        <div className="col-span-2">
                          <p className="text-sm text-gray-600">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        
                        {/* Actions */}
                        <div className="col-span-2 text-center">
                          {canDeleteLog(log) ? (
                            <button
                              onClick={() => handleOpenDeleteModal(log)}
                              className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center space-x-1 mx-auto"
                              title="Delete this log"
                              disabled={apiLoading.delete}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              <span>Delete</span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic px-2 py-1 bg-gray-100 rounded">
                              Protected
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Performed By */}
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          <strong>Performed by:</strong> {log.performedBy}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Deletable logs: <span className="font-semibold">{deletableLogs.length}</span> of <span className="font-semibold">{filteredLogs.length}</span> shown
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && logToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
            <div className="mt-3">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
                Delete Log Entry
              </h3>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700 text-center">
                  Are you sure you want to delete this {logToDelete.action} log?
                  This action cannot be undone.
                </p>
                {logToDelete.itemCode && (
                  <p className="text-sm text-red-700 text-center mt-1 font-medium">
                    Item: {logToDelete.itemCode}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-mono text-red-600 bg-red-50 px-1 rounded">confirm</span> to proceed:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                  placeholder="Type 'confirm' here"
                />
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleCloseDeleteModal}
                  disabled={apiLoading.delete}
                  className="w-1/3 px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteLog}
                  disabled={!isDeleteEnabled || apiLoading.delete}
                  className="w-2/3 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {apiLoading.delete ? (
                    <span>Deleting...</span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete Log</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LogManagement;