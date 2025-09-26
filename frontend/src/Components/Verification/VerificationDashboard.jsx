import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "../Loader/Spinner";
import Toast from "../Toast/Toast";

const VerificationDashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [newSession, setNewSession] = useState({
    sessionName: "",
    sessionType: "full",
    categories: [],
    notes: ""
  });
  const [dropdownOptions, setDropdownOptions] = useState({
    categories: []
  });
  const [toasts, setToasts] = useState([]);
  const [apiLoading, setApiLoading] = useState({
    create: false,
    delete: false,
    fetch: false
  });

  // Add toast function
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    checkAuth();
    fetchSessions();
    fetchDropdownOptions();
    // eslint-disable-next-line
  }, []);

  const checkAuth = () => {
    if (!window.localStorage.getItem("userInfo")) {
      navigate("/login");
    }
  };

  const fetchSessions = async () => {
    try {
      setApiLoading(prev => ({...prev, fetch: true}));
      const response = await fetch("/api/verification/sessions", {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      } else {
        addToast("Failed to fetch sessions", "error");
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      addToast("Error fetching sessions", "error");
    } finally {
      setApiLoading(prev => ({...prev, fetch: false}));
    }
  };

  const fetchDropdownOptions = async () => {
    try {
      const response = await fetch("/api/dropdownoption/dropdownoptions", {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });
      if (response.ok) {
        const options = await response.json();
        setDropdownOptions(options);
      }
    } catch (error) {
      console.error("Error fetching dropdown options:", error);
      addToast("Error loading categories", "warning");
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.sessionName.trim()) {
      addToast("Please enter a session name", "warning");
      return;
    }

    if (newSession.sessionType === 'category' && newSession.categories.length === 0) {
      addToast("Please select at least one category", "warning");
      return;
    }

    setApiLoading(prev => ({...prev, create: true}));
    try {
      const response = await fetch("/api/verification/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
        body: JSON.stringify(newSession),
      });

      if (response.ok) {
        addToast(`Session "${newSession.sessionName}" created successfully!`, "success");
        setShowCreateModal(false);
        setNewSession({
          sessionName: "",
          sessionType: "full",
          categories: [],
          notes: ""
        });
        fetchSessions();
      } else {
        const errorData = await response.json();
        addToast(errorData.message || "Failed to create session", "error");
      }
    } catch (error) {
      console.error("Error creating session:", error);
      addToast("Error creating session", "error");
    } finally {
      setApiLoading(prev => ({...prev, create: false}));
    }
  };

  // Delete session function
  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;

    setApiLoading(prev => ({...prev, delete: true}));
    try {
      const response = await fetch(`/api/verification/session/${sessionToDelete.sessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });

      if (response.ok) {
        addToast(`Session "${sessionToDelete.sessionName}" deleted successfully`, "success");
        setShowDeleteModal(false);
        setSessionToDelete(null);
        setDeleteConfirmText("");
        fetchSessions();
      } else {
        const errorData = await response.json();
        addToast(errorData.message || "Failed to delete session", "error");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
      addToast("Error deleting session", "error");
    } finally {
      setApiLoading(prev => ({...prev, delete: false}));
    }
  };

  // Open delete confirmation modal
  const openDeleteModal = (session, e) => {
    e.stopPropagation();
    setSessionToDelete(session);
    setShowDeleteModal(true);
  };

  // Close delete modal and reset state
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSessionToDelete(null);
    setDeleteConfirmText("");
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const handleCategoryChange = (category) => {
    const updatedCategories = newSession.categories.includes(category)
      ? newSession.categories.filter(c => c !== category)
      : [...newSession.categories, category];
    
    setNewSession({ ...newSession, categories: updatedCategories });
  };

  const isDeleteEnabled = deleteConfirmText.toLowerCase() === "confirm";

  // Check if any API call is loading
  const isLoadingState = Object.values(apiLoading).some(loading => loading);

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
              {apiLoading.create && "Creating session..."}
              {apiLoading.delete && "Deleting session..."}
              {apiLoading.fetch && "Loading sessions..."}
            </p>
          </div>
        </div>
      )}
      
      <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200">
        <div className="flex justify-between items-center m-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Stock Verification</h2>
            <p className="text-gray-600 mt-1">Manage and track your inventory verification sessions</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            disabled={apiLoading.create}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Start New Verification</span>
          </button>
        </div>

        {/* Stats Summary */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                
                  <p className="text-blue-600 text-sm">Total Sessions</p>
                  <p className="text-2xl font-bold text-blue-700">{sessions.length}</p>
                
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                
                  <p className="text-green-600 text-sm">Active</p>
                  <p className="text-2xl font-bold text-green-700">
                    {sessions.filter(s => s.status === 'active').length}
                  </p>
                
              </div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                
                  <p className="text-blue-600 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {sessions.filter(s => s.status === 'completed').length}
                  </p>
                
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                  <p className="text-gray-600 text-sm">Paused</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {sessions.filter(s => s.status === 'paused').length}
                  </p>
              </div>
            </div>
          </div>
        )}

        {/* Create Session Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Create New Session
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                    disabled={apiLoading.create}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Name *
                    </label>
                    <input
                      type="text"
                      value={newSession.sessionName}
                      onChange={(e) => setNewSession({ ...newSession, sessionName: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g., Monthly Stock Check - Jan 2025"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Type
                    </label>
                    <select
                      value={newSession.sessionType}
                      onChange={(e) => setNewSession({ ...newSession, sessionType: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="full">Full Inventory</option>
                      <option value="category">Category Specific</option>
                    </select>
                  </div>

                  {newSession.sessionType === 'category' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Categories *
                      </label>
                      <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                        {dropdownOptions.categories.length === 0 ? (
                          <p className="text-gray-500 text-sm">Loading categories...</p>
                        ) : (
                          dropdownOptions.categories.map((categoryObj) =>
                            categoryObj.category.map((category) => (
                              <div key={category} className="flex items-center mb-2">
                                <input
                                  type="checkbox"
                                  id={category}
                                  checked={newSession.categories.includes(category)}
                                  onChange={() => handleCategoryChange(category)}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <label htmlFor={category} className="ml-2 text-sm text-gray-700">
                                  {category}
                                </label>
                              </div>
                            ))
                          )
                        )}
                      </div>
                      {newSession.categories.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Selected: {newSession.categories.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={newSession.notes}
                      onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      rows="3"
                      placeholder="Additional notes about this verification session..."
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      disabled={apiLoading.create}
                      className="w-1/3 px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateSession}
                      disabled={apiLoading.create}
                      className="w-2/3 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {apiLoading.create ? (
                        <>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Create Session</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && sessionToDelete && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                
                <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
                  Delete Verification Session
                </h3>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700 text-center">
                    Are you sure you want to delete <strong>"{sessionToDelete.sessionName}"</strong>? 
                    This action cannot be undone and will permanently delete all associated data.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="font-mono text-red-600 bg-red-50 px-1 rounded">confirm</span> to proceed:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                    placeholder="Type 'confirm' here"
                  />
                </div>

                <div className="flex justify-center space-x-3">
                  <button
                    onClick={closeDeleteModal}
                    disabled={apiLoading.delete}
                    className="w-1/3 px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteSession}
                    disabled={!isDeleteEnabled || apiLoading.delete}
                    className="w-2/3 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {apiLoading.delete ? (
                      <>
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete Session</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sessions List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Verification Sessions ({sessions.length})
            </h3>
            {sessions.length > 0 && (
              <div className="text-sm text-gray-600">
                Sorted by: <span className="font-medium">Most Recent</span>
              </div>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No verification sessions found</h3>
              <p className="text-gray-600 mb-4">Get started by creating your first verification session</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Create First Session
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 cursor-pointer bg-white relative group"
                  onClick={() => navigate(`/verification/${session.sessionId}`)}
                >
                  {/* Delete Button */}
                  <button
                    onClick={(e) => openDeleteModal(session, e)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete session"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {session.sessionName}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                        ID: {session.sessionId}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mb-4">
                    <div>
                      <p className="text-gray-600 text-xs uppercase tracking-wide font-medium">Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{session.sessionType}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs uppercase tracking-wide font-medium">Progress</p>
                      <p className="font-semibold text-gray-900">
                        {session.totalVerifiedItems} / {session.totalExpectedItems}
                        <span className="text-gray-500 text-xs ml-1">
                          ({session.totalExpectedItems > 0 ? Math.round((session.totalVerifiedItems / session.totalExpectedItems) * 100) : 0}%)
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs uppercase tracking-wide font-medium">Discrepancies</p>
                      <p className={`font-semibold ${session.totalDiscrepancies > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {session.totalDiscrepancies}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-xs uppercase tracking-wide font-medium">Started</p>
                      <p className="font-semibold text-gray-900">{formatDate(session.startedAt)}</p>
                    </div>
                  </div>

                  {session.status === 'completed' && (
                    <div className="pt-4 border-t border-gray-200 grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <p className="text-gray-600 text-xs uppercase tracking-wide font-medium">Expected Value</p>
                        <p className="font-semibold text-gray-900">₹{session.expectedFinancialValue?.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs uppercase tracking-wide font-medium">Variance</p>
                        <p className={`font-semibold ${session.varianceValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{session.varianceValue?.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Last updated: {formatDate(session.updatedAt || session.startedAt)}
                      </span>
                      <button 
                        onClick={() => navigate(`/verification/${session.sessionId}`)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center space-x-1"
                      >
                        <span>View Details</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default VerificationDashboard;