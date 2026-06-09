import Spinner from "./Spinner";
import ReactDOM from "react-dom";

export const FullScreenSpinner = ({ message = "Loading…" }) =>
  ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
    >
      <Spinner size={48} />
      {message && (
        <p
          className="text-white text-sm text-[1.8rem] font-extrabold tracking-wide "
          style={{ textShadow: "0 5px 15px rgba(0,0,0,0.99)" }}
        >
          {message}
        </p>
      )}
    </div>,
    document.body,
  );