import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Spinner from "../Loader/Spinner";

const VerificationDashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSession, setNewSession] = useState({
    sessionName: "",
    sessionType: "full",
    categories: [],
    notes: ""
  });
  const [dropdownOptions, setDropdownOptions] = useState({
    categories: []
  });

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
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
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
    }
  };

  const handleCreateSession = async () => {
    if (!newSession.sessionName.trim()) {
      alert("Please enter a session name");
      return;
    }

    setIsLoading(true);
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
        const data = await response.json();
        alert(`Session created successfully! Session ID: ${data.sessionId}`);
        setShowCreateModal(false);
        setNewSession({
          sessionName: "",
          sessionType: "full",
          categories: [],
          notes: ""
        });
        fetchSessions();
      } else {
        alert("Failed to create session");
      }
    } catch (error) {
      console.error("Error creating session:", error);
      alert("Error creating session");
    }
    setIsLoading(false);
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
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCategoryChange = (category) => {
    const updatedCategories = newSession.categories.includes(category)
      ? newSession.categories.filter(c => c !== category)
      : [...newSession.categories, category];
    
    setNewSession({ ...newSession, categories: updatedCategories });
  };

  return (
    <> 
        {isLoading && <>
              <div
                className="fixed inset-0 flex items-center justify-center"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
              >
                <Spinner></Spinner>
                  
              </div>
            </>}
    <div className="bg-white p-6 shadow-md rounded-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Stock Verification</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
        >
          Start New Verification
        </button>
      </div>

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Create New Verification Session
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Name *
                </label>
                <input
                  type="text"
                  value={newSession.sessionName}
                  onChange={(e) => setNewSession({ ...newSession, sessionName: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., Monthly Stock Check - Jan 2025"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Type
                </label>
                <select
                  value={newSession.sessionType}
                  onChange={(e) => setNewSession({ ...newSession, sessionType: e.target.value })}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="full">Full Inventory</option>
                  <option value="partial">Partial Inventory</option>
                  <option value="category">Category Specific</option>
                </select>
              </div>

              {newSession.sessionType === 'category' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Categories
                  </label>
                  <div className="max-h-32 overflow-y-auto border rounded-md p-2">
                    {dropdownOptions.categories.map((categoryObj) =>
                      categoryObj.category.map((category) => (
                        <div key={category} className="flex items-center mb-1">
                          <input
                            type="checkbox"
                            id={category}
                            checked={newSession.categories.includes(category)}
                            onChange={() => handleCategoryChange(category)}
                            className="mr-2"
                          />
                          <label htmlFor={category} className="text-sm">{category}</label>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={newSession.notes}
                  onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  rows="3"
                  placeholder="Additional notes about this verification session..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                >
                  {isLoading ? "Creating..." : "Create Session"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No verification sessions found. Start your first verification session!
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.sessionId}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/verification/${session.sessionId}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {session.sessionName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Session ID: {session.sessionId}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                  {session.status.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Type</p>
                  <p className="font-medium">{session.sessionType}</p>
                </div>
                <div>
                  <p className="text-gray-600">Progress</p>
                  <p className="font-medium">
                    {session.totalVerifiedItems} / {session.totalExpectedItems}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Discrepancies</p>
                  <p className="font-medium text-red-600">{session.totalDiscrepancies}</p>
                </div>
                <div>
                  <p className="text-gray-600">Started</p>
                  <p className="font-medium">{formatDate(session.startedAt)}</p>
                </div>
              </div>

              {session.status === 'completed' && (
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Expected Value</p>
                    <p className="font-medium">₹{session.expectedFinancialValue?.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Variance</p>
                    <p className={`font-medium ${session.varianceValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{session.varianceValue?.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
};

export default VerificationDashboard;