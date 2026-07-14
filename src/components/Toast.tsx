import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

interface ToastPayload {
  message: string;
  action?: { label: string; onClick: () => void };
}

type ShowToastFn = (
  msg: string,
  action?: { label: string; onClick: () => void },
) => void;

const ToastContext = createContext<ShowToastFn | null>(null);

export function useToast(): ShowToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<ToastPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast: ShowToastFn = useCallback((msg, action) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPayload({ message: msg, action });
    setVisible(true);
    const duration = action ? 5000 : 1800;
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setPayload(null);
    }, duration);
  }, []);

  const handleAction = () => {
    if (payload?.action) {
      payload.action.onClick();
      if (timerRef.current) clearTimeout(timerRef.current);
      setVisible(false);
      setPayload(null);
    }
  };

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={`toast ${visible ? "show" : ""}`}>
        <span style={{ color: "#7fe0ab" }}>✓</span>
        <span>{payload?.message}</span>
        {payload?.action && (
          <button
            onClick={handleAction}
            style={{
              marginLeft: "6px",
              background: "none",
              border: "none",
              color: "#7cc0ff",
              fontSize: "13.5px",
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              fontFamily: "var(--font-sans)",
            }}
          >
            {payload.action.label}
          </button>
        )}
      </div>
    </ToastContext.Provider>
  );
}
