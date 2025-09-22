import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "../Loader/Spinner";

const LogManagement = ({ sessionId, isOpen, onClose, onLogDeleted }) => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterAction, setFilterAction] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Add state for delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [logToDelete, setLogToDelete] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [deleteInProcess, setDeleteInProcess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
    // eslint-disable-next-line
  }, [isOpen, sessionId]);

  const fetchLogs = async () => {
    setIsLoading(true);
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
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const canDeleteLog = (log) => {
    const protectedActions = ['session_start', 'session_complete'];
    return !protectedActions.includes(log.action);
  };

  const getLogActionColor = (action) => {
    const colors = {
      'scan': 'bg-green-100 text-green-800 border-green-200',
      'manual_entry': 'bg-blue-100 text-blue-800 border-blue-200',
      'correction': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'deletion': 'bg-red-100 text-red-800 border-red-200',
      'session_start': 'bg-purple-100 text-purple-800 border-purple-200',
      'session_complete': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[action] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const handleOpenDeleteModal = (logId) => {
    setLogToDelete(logId);
    setIsDeleteModalOpen(true);
    setConfirmText("");
  };

  const handleCloseDeleteModal = () => {
    setConfirmText("");
    setIsDeleteModalOpen(false);
    setLogToDelete(null);
  };

  const handleUserInputChange = (e) => {
    setConfirmText(e.target.value.toUpperCase());
  };

  const handleDeleteConfirmation = async () => {
    if (confirmText !== "CONFIRM") return;
    
    setDeleteInProcess(true);
    
    try {
      await handleSingleDelete();
      
      setShowTooltip(true);
      setTimeout(() => {
        setShowTooltip(false);
      }, 3000);
    } catch (error) {
      console.error("Error deleting log:", error);
    } finally {
      setDeleteInProcess(false);
      handleCloseDeleteModal();
    }
  };

  const handleSingleDelete = async () => {
    if (!logToDelete) return;

    try {
      const response = await fetch(`/api/verification/log/${logToDelete}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });

      if (response.ok) {
        fetchLogs();
        
        if (onLogDeleted) {
          onLogDeleted();
        }
      } else {
        const error = await response.json();
        throw new Error(error.message || "Error deleting log");
      }
    } catch (error) {
      console.error("Error deleting log:", error);
      throw error;
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

  if (!isOpen) return null;

  return (
    <> 
      {isLoading && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
        >
          <Spinner></Spinner>
        </div>
      )}
      
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xl font-medium">Advanced Log Management</h3>
              <p className="text-sm text-gray-600">
                Session: {sessionId} | Total Logs: {logs.length} | Deletable: {deletableLogs.length}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Controls */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Filter by Action */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Action
                </label>
                <select
                  value={filterAction}
                  onChange={(e) => setFilterAction(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="all">All Actions</option>
                  <option value="scan">QR Scans</option>
                  <option value="manual_entry">Manual Entries</option>
                  <option value="correction">Corrections</option>
                  <option value="deletion">Deletions</option>
                  <option value="session_start">Session Start</option>
                  <option value="session_complete">Session Complete</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                  placeholder="Search logs..."
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="timestamp">Timestamp</option>
                  <option value="action">Action</option>
                  <option value="itemCode">Item Code</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex justify-end">
              <button
                onClick={fetchLogs}
                className="text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Logs List */}
          <div className="max-h-96 overflow-y-auto border rounded-lg">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No logs found with current filters
              </div>
            ) : (
              <div className="divide-y">
                {filteredLogs.map((log, index) => (
                  <div key={log._id} className={`p-4 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                    <div className="flex items-start justify-between">
                      {/* Log Details */}
                      <div className="flex-grow">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getLogActionColor(log.action)}`}>
                            {log.action.toUpperCase()}
                          </span>
                          {log.itemCode && (
                            <span className="text-blue-600 font-medium text-sm">
                              {log.itemCode}
                            </span>
                          )}
                          <span className="text-gray-500 text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-700 mb-1">
                          <strong>Details:</strong> {log.details}
                        </p>
                        
                        {(log.previousQuantity !== undefined || log.newQuantity !== undefined) && (
                          <p className="text-xs text-gray-500">
                            <strong>Quantity:</strong> {log.previousQuantity || 0} → {log.newQuantity || 0}
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-1">
                          <strong>By:</strong> {log.performedBy}
                        </p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex space-x-1 ml-4">
                        {canDeleteLog(log) ? (
                          <button
                            onClick={() => handleOpenDeleteModal(log._id)}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
                            title="Delete this log"
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 italic px-2 py-1">
                            Protected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="mt-4 pt-4 border-t bg-gray-50 rounded-lg p-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center text-sm">
              <div>
                <div className="font-semibold text-lg text-indigo-600">
                  {logs.filter(log => log.action === 'scan').length}
                </div>
                <div className="text-gray-600">QR Scans</div>
              </div>
              <div>
                <div className="font-semibold text-lg text-blue-600">
                  {logs.filter(log => log.action === 'manual_entry').length}
                </div>
                <div className="text-gray-600">Manual Entries</div>
              </div>
              <div>
                <div className="font-semibold text-lg text-yellow-600">
                  {logs.filter(log => log.action === 'correction').length}
                </div>
                <div className="text-gray-600">Corrections</div>
              </div>
              <div>
                <div className="font-semibold text-lg text-red-600">
                  {logs.filter(log => log.action === 'deletion').length}
                </div>
                <div className="text-gray-600">Deletions</div>
              </div>
              <div>
                <div className="font-semibold text-lg text-green-600">
                  {deletableLogs.length}
                </div>
                <div className="text-gray-600">Deletable</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[60]">
          <div className="bg-white p-6 rounded-md w-11/12 max-w-md">
            <h3 className="text-lg font-medium mb-4">Delete log?</h3>
            <p className="mb-4">
              Type 'CONFIRM' to delete this log.
              This action cannot be undone.
            </p>
            
            <div className="flex justify-center mb-4">
              <input
                type="text"
                value={confirmText}
                onChange={handleUserInputChange}
                className="border border-gray-300 p-2 rounded-md text-center w-full"
                placeholder="Type CONFIRM here"
              />
            </div>
            
            <div className="flex justify-between">
              <button
                onClick={handleCloseDeleteModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md mr-2"
              >
                Cancel
              </button>
              <button
                disabled={confirmText !== "CONFIRM" || deleteInProcess}
                onClick={handleDeleteConfirmation}
                className={`px-4 py-2 rounded-md ${
                  confirmText !== "CONFIRM" || deleteInProcess
                    ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                    : "bg-red-500 text-white"
                }`}
              >
                {deleteInProcess ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Tooltip */}
      {showTooltip && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-70">
          <div className="flex items-center justify-center bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative w-full m-5 max-w-md">
            <strong className="font-bold">Log deleted successfully</strong>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
              <svg
                className="fill-current h-6 w-6 text-green-500 cursor-pointer"
                role="button"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                onClick={() => setShowTooltip(false)}
              >
                <title>Close</title>
                <path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" />
              </svg>
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default LogManagement;