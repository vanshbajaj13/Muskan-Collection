import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QrScanner from "react-qr-scanner";
import LogManagement from "./LogManagement";
import Spinner from "../Loader/Spinner";
import Toast from "../Toast/Toast";

// Debounce utility function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const VerificationSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [currentItem, setCurrentItem] = useState({
    code: "",
    verifiedQuantity: 1, // Default to 1
    notes: "",
  });
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showDeletionPreview, setShowDeletionPreview] = useState(false);
  const [deletionPreview, setDeletionPreview] = useState(null);
  const [pendingLogDeletion, setPendingLogDeletion] = useState(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState("");
  const [toasts, setToasts] = useState([]);
  const [apiLoading, setApiLoading] = useState({
    verify: false,
    complete: false,
    delete: false,
    logs: false,
    bulkDelete: false,
    loadMore: false
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isScanned, setIsScanned] = useState(false);

  // Add a toast message
  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    checkAuth();
    fetchSessionData();
    fetchItems(1, false);
  }, [sessionId]);

  const checkAuth = () => {
    if (!window.localStorage.getItem("userInfo")) {
      navigate("/login");
    }
  };

  const fetchSessionData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/verification/session/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        setSummary(data.summary);
      } else {
        navigate("/verification");
      }
    } catch (error) {
      console.error("Error fetching session data:", error);
      addToast("Error fetching session data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchItems = async (page = 1, append = false) => {
    try {
      if (append) {
        setApiLoading(prev => ({...prev, loadMore: true}));
        addToast("Loading more items...", "info");
      }

      // Build URL with search term if present
      const url = `/api/verification/session/${sessionId}/items?page=${page}&limit=10${
        searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''
      }`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (append && !searchTerm) {
          // Only append when not searching
          setItems(prev => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        
        setPagination(data.pagination);
        setSummary(data.summary);
      } else {
        addToast("Failed to fetch items", "error");
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      addToast("Error fetching items", "error");
    } finally {
      setApiLoading(prev => ({...prev, loadMore: false}));
      setSearchLoading(false);
    }
  };

  // Handle search with API call
  const handleSearch = async (term) => {
    if (term.trim() === "") {
      // If search is empty, load first page normally
      setSearchTerm("");
      fetchItems(1, false);
      return;
    }

    try {
      setSearchLoading(true);
      setSearchTerm(term);
      
      const response = await fetch(
        `/api/verification/session/${sessionId}/items?page=1&limit=50&search=${encodeURIComponent(term)}`,
        {
          headers: {
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setItems(data.items);
        // Adjust pagination for search results
        setPagination({
          ...data.pagination,
          hasNextPage: data.items.length >= 50
        });
      }
    } catch (error) {
      console.error("Error searching items:", error);
      addToast("Error searching items", "error");
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((term) => {
      handleSearch(term);
    }, 500),
    [sessionId]
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    // Update the input value in real-time for display
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const clearSearch = () => {
    setSearchTerm("");
    fetchItems(1, false);
  };

  const fetchLogs = async () => {
    try {
      setApiLoading(prev => ({...prev, logs: true}));
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
      } else {
        addToast("Failed to fetch logs", "error");
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      addToast("Error fetching logs", "error");
    } finally {
      setApiLoading(prev => ({...prev, logs: false}));
    }
  };

  const canDeleteLog = (log) => {
    const protectedActions = ["session_start", "session_complete"];
    return !protectedActions.includes(log.action);
  };

  const getLogActionColor = (action) => {
    switch (action) {
      case "scan":
        return "bg-green-100 text-green-800";
      case "manual_entry":
        return "bg-blue-100 text-blue-800";
      case "correction":
        return "bg-yellow-100 text-yellow-800";
      case "deletion":
        return "bg-red-100 text-red-800";
      case "session_start":
        return "bg-purple-100 text-purple-800";
      case "session_complete":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePreviewLogDeletion = async (logId) => {
    try {
      setApiLoading(prev => ({...prev, delete: true}));
      const response = await fetch(
        `/api/verification/log/${logId}/preview-deletion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
        }
      );

      if (response.ok) {
        const preview = await response.json();
        setDeletionPreview(preview);
        setPendingLogDeletion(logId);
        setShowDeletionPreview(true);
      } else {
        const error = await response.json();
        addToast(error.message || "Error previewing deletion", "error");
      }
    } catch (error) {
      console.error("Error previewing deletion:", error);
      addToast("Error previewing deletion", "error");
    } finally {
      setApiLoading(prev => ({...prev, delete: false}));
    }
  };

  const handleDeleteLog = async (logId, logData) => {
    try {
      setApiLoading(prev => ({...prev, delete: true}));
      const response = await fetch(`/api/verification/log/${logId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        addToast("Log deleted successfully!", "success");

        // Refresh both logs and session data
        fetchLogs();
        fetchSessionData();
        fetchItems(pagination.currentPage, false); // Refresh current page
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

  const confirmLogDeletion = async () => {
    if (!pendingLogDeletion) return;

    const logToDelete = logs.find((log) => log._id === pendingLogDeletion);
    if (!logToDelete) return;

    setShowDeletionPreview(false);
    await handleDeleteLog(pendingLogDeletion, logToDelete);
    setPendingLogDeletion(null);
    setDeletionPreview(null);
  };

  const handleScan = (data) => {
    const regex = /^[A-Z]{3}\d{4}$/;
    if (data && regex.test(data.text)) {
      setCurrentItem({ ...currentItem, code: data.text, verifiedQuantity: 1 });
      setShowScanner(false);
      setIsScanned(true);
    }
  };

  const handleEnterItem = async () => {
    if (!currentItem.code || !currentItem.verifiedQuantity) {
      addToast("Please enter item code and verified quantity", "warning");
      return;
    }

    try {
      setApiLoading(prev => ({...prev, verify: true}));
      
      // Determine which API to call based on whether it was scanned or manually entered
      const endpoint = isScanned ? "/api/verification/verify/scan" : "/api/verification/verify/manual";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            JSON.parse(window.localStorage.getItem("userInfo")).token
          }`,
        },
        body: JSON.stringify({
          sessionId,
          itemCode: currentItem.code,
          verifiedQuantity: parseInt(currentItem.verifiedQuantity),
          notes: currentItem.notes,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addToast(data.message, "success");
        setCurrentItem({ code: "", verifiedQuantity: 1, notes: "" });
        setIsScanned(false);
        
        // Refresh data
        fetchSessionData();
        fetchItems(pagination.currentPage, false);
      } else {
        const error = await response.json();
        addToast(error.message || "Error verifying item", "error");
      }
    } catch (error) {
      console.error("Error verifying item:", error);
      addToast("Error verifying item", "error");
    } finally {
      setApiLoading(prev => ({...prev, verify: false}));
    }
  };

  const handleCompleteSession = async () => {
    if (confirmText.toLowerCase() !== "confirm") {
      addToast("Please type 'confirm' to complete the session", "warning");
      return;
    }

    try {
      setApiLoading(prev => ({...prev, complete: true}));
      const response = await fetch(
        `/api/verification/session/${sessionId}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              JSON.parse(window.localStorage.getItem("userInfo")).token
            }`,
          },
          body: JSON.stringify({ notes: "" }),
        }
      );

      if (response.ok) {
        addToast("Session completed successfully!", "success");
        setShowCompleteModal(false);
        setConfirmText("");
        navigate("/verification");
      } else {
        const error = await response.json();
        addToast(error.message || "Error completing session", "error");
      }
    } catch (error) {
      console.error("Error completing session:", error);
      addToast("Error completing session", "error");
    } finally {
      setApiLoading(prev => ({...prev, complete: false}));
    }
  };

  const handleLoadMore = () => {
    if (pagination.hasNextPage) {
      fetchItems(pagination.currentPage + 1, true);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-800";
      case "discrepancy":
        return "bg-red-100 text-red-800";
      case "overage":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!session && !isLoading) {
    return <div className="text-center text-red-500">Session not found</div>;
  }

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
      {(isLoading || Object.values(apiLoading).some(loading => loading)) && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <Spinner />
            <p className="mt-2 text-gray-700">
              {searchLoading && "Searching..."}
              {apiLoading.verify && "Verifying item..."}
              {apiLoading.complete && "Completing session..."}
              {apiLoading.delete && "Processing deletion..."}
              {apiLoading.bulkDelete && "Processing bulk deletion..."}
              {apiLoading.logs && "Loading logs..."}
              {apiLoading.loadMore && "Loading more items..."}
              {isLoading && "Loading session data..."}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 shadow-md rounded-md">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-semibold">{session?.sessionName}</h2>
            <p className="text-gray-600">Session ID: {session?.sessionId}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setShowLogs(true);
                fetchLogs();
              }}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              View Logs
            </button>
            {session?.status === "active" && (
              <button
                onClick={() => setShowCompleteModal(true)}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                disabled={apiLoading.complete}
              >
                Complete Session
              </button>
            )}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {summary.totalItems || 0}
            </p>
            <p className="text-gray-600">Total Items</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {summary.verifiedItems || 0}
            </p>
            <p className="text-gray-600">Verified</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {summary.pendingItems || 0}
            </p>
            <p className="text-gray-600">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {summary.discrepancyItems || 0}
            </p>
            <p className="text-gray-600">Discrepancies</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {summary.overageItems || 0}
            </p>
            <p className="text-gray-600">Overusage</p>
          </div>
        </div>

        {/* Verification Form */}
        {session?.status === "active" && (
          <div className="mb-6 p-4 border rounded-lg bg-blue-50">
            <h3 className="text-lg font-medium mb-4">Verify Item</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Code
                </label>
                <input
                  type="text"
                  value={currentItem.code}
                  onChange={(e) => {
                    setCurrentItem({
                      ...currentItem,
                      code: e.target.value.toUpperCase(),
                    });
                    setIsScanned(false);
                  }}
                  className="w-full p-2 border rounded-md"
                  placeholder="Enter item code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Verified Quantity
                </label>
                <input
                  type="number"
                  value={currentItem.verifiedQuantity}
                  onWheel={(e) => e.target.blur()}
                  onChange={(e) =>
                    setCurrentItem({
                      ...currentItem,
                      verifiedQuantity: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded-md"
                  placeholder="Quantity found"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={currentItem.notes}
                  onChange={(e) =>
                    setCurrentItem({ ...currentItem, notes: e.target.value })
                  }
                  className="w-full p-2 border rounded-md"
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setShowScanner(!showScanner)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                aria-label={showScanner ? "Hide QR Scanner" : "Show QR Scanner"}
              >
                {showScanner ? "Hide Scanner" : "Scan QR Code"}
              </button>
              <button
                onClick={handleEnterItem}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                disabled={apiLoading.verify}
              >
                {apiLoading.verify ? "Verifying..." : "Enter"}
              </button>
              <button
                onClick={() => {
                  setCurrentItem({ code: "", verifiedQuantity: 1, notes: "" });
                  setIsScanned(false);
                }}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Clear
              </button>
            </div>

            {showScanner && (
              <div className="mb-4">
                <QrScanner
                  onScan={handleScan}
                  onError={(error) => console.error("Scanner error:", error)}
                  constraints={{
                    audio: false,
                    video: { facingMode: "environment" },
                  }}
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 border rounded-md"
            >
              <option value="all">All Items</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="discrepancy">Discrepancies</option>
              <option value="overage">Overusage</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {searchLoading ? "Searching..." : "Search"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full p-2 border rounded-md pr-10"
                placeholder="Search by code, brand, or product"
              />
              {searchTerm && !searchLoading && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-2 text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium">
            {searchTerm ? "Search Results" : "Items"} ({items.length} of {searchTerm ? pagination.totalItems : summary.totalItems || 0})
            {searchTerm && (
              <span className="text-sm text-gray-600 ml-2">
                (searching for: "{searchTerm}")
              </span>
            )}
          </h3>

          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "No items found matching your search" : "No items found"}
            </div>
          ) : (
            <>
              <div className="max-h-96 overflow-y-auto">
                {items.map((item) => (
                  <div
                    key={item._id}
                    className="border rounded-lg p-4 hover:bg-gray-50 mb-2"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{item.itemCode}</h4>
                        <p className="text-sm text-gray-600">
                          {item.originalDetails.brand} -{" "}
                          {item.originalDetails.product} -{" "}
                          {item.originalDetails.size}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          item.verificationStatus
                        )}`}
                      >
                        {item.verificationStatus.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Expected</p>
                        <p className="font-medium">{item.expectedQuantity}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Verified</p>
                        <p className="font-medium">{item.verifiedQuantity}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Variance</p>
                        <p
                          className={`font-medium ${
                            item.varianceQuantity >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {item.varianceQuantity > 0 ? "+" : ""}
                          {item.varianceQuantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Value Impact</p>
                        <p
                          className={`font-medium ${
                            item.varianceValue >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          ₹{item.varianceValue?.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>

                    {item.notes && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                        <strong>Notes:</strong> {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Load More Button - only show if not searching or if search has more results */}
              {pagination.hasNextPage && !searchLoading && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={apiLoading.loadMore}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300"
                  >
                    {apiLoading.loadMore ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Log Management Modal */}
        {showLogs && (
          <LogManagement
            sessionId={sessionId}
            isOpen={showLogs}
            onClose={() => setShowLogs(false)}
            onLogDeleted={() => {
              fetchLogs();
              fetchSessionData();
              fetchItems(pagination.currentPage, false);
            }}
          />
        )}

        {/* Complete Session Confirmation Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
            <div className="relative top-32 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Confirm Session Completion
                </h3>
                
                <div className="space-y-3">
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                    <p className="text-sm">
                      Are you sure you want to complete this verification session? 
                      This action cannot be undone.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type "confirm" to proceed:
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="Type 'confirm' here"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <button
                      onClick={() => {
                        setShowCompleteModal(false);
                        setConfirmText("");
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCompleteSession}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-green-300"
                      disabled={apiLoading.complete || confirmText.toLowerCase() !== "confirm"}
                    >
                      {apiLoading.complete ? "Completing..." : "Confirm Complete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Log Deletion Preview Modal */}
        {showDeletionPreview && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
            <div className="relative top-32 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Deletion Impact Preview
                </h3>

                {deletionPreview && (
                  <div className="space-y-3">
                    <div
                      className={`p-3 rounded ${
                        deletionPreview.canDelete
                          ? "bg-yellow-50 border-l-4 border-yellow-400"
                          : "bg-red-50 border-l-4 border-red-400"
                      }`}
                    >
                      <div className="flex">
                        <div className="ml-3">
                          <p className="text-sm">
                            <strong>Action:</strong> {deletionPreview.logType}
                          </p>
                          {deletionPreview.affectedItem && (
                            <p className="text-sm">
                              <strong>Item:</strong>{" "}
                              {deletionPreview.affectedItem}
                            </p>
                          )}
                          <p className="text-sm mt-2">
                            <strong>Impact:</strong> {deletionPreview.impact}
                          </p>
                          {!deletionPreview.canDelete &&
                            deletionPreview.reason && (
                              <p className="text-sm text-red-600 mt-2">
                                <strong>Reason:</strong>{" "}
                                {deletionPreview.reason}
                              </p>
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <button
                        onClick={() => setShowDeletionPreview(false)}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      {deletionPreview.canDelete && (
                        <button
                          onClick={() => confirmLogDeletion()}
                          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                          disabled={apiLoading.delete}
                        >
                          {apiLoading.delete ? "Deleting..." : "Confirm Deletion"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default VerificationSession;