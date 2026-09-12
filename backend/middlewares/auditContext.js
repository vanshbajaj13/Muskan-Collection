const { AsyncLocalStorage } = require("async_hooks");
const jwt = require("jsonwebtoken");

const auditContext = new AsyncLocalStorage();

/**
 * Mount this ONCE, globally, near the top of your middleware stack
 * (e.g. right after express.json()). It does NOT replace or duplicate
 * your existing `protect` middleware — it just independently peeks at
 * the same Authorization header so audit logs know "who did this",
 * without any change to authMiddleware.js.
 *
 *   app.use(captureAuditUser);
 */
const captureAuditUser = (req, res, next) => {
  let user = "unknown";
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      // Uses the same secret your authMiddleware verifies with.
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user =
        decoded?.name ||
        decoded?.email ||
        decoded?._id ||
        decoded?.id ||
        "unknown";
    }
  } catch (e) {
    // Invalid/expired token — existing authMiddleware will handle rejecting
    // the request itself; here we just fall back to "unknown" for logging.
  }
  auditContext.run({ user }, next);
};

const getCurrentAuditUser = () => auditContext.getStore()?.user || "system";

module.exports = { captureAuditUser, getCurrentAuditUser };
