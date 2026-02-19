import React, {
  createContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { Notification as StellarNotification } from "@stellar/design-system";
import "./NotificationProvider.css"; // Import CSS for sliding effect

type NotificationType =
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "warning"
  | "info";

interface ShowNotificationParams {
  title: string;
  message?: string;
  type: NotificationType;
  copyText?: string;
  durationMs?: number;
}

interface NotificationMessage extends ShowNotificationParams {
  id: string;
  isVisible: boolean;
}

interface NotificationContextType {
  showNotification: (params: ShowNotificationParams) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

const DEFAULT_VISIBLE_MS = 6500;
const EXIT_ANIMATION_MS = 900;

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pausedIds, setPausedIds] = useState<string[]>([]);

  const hideTimers = useRef<Record<string, number>>({});
  const removeTimers = useRef<Record<string, number>>({});
  const timerStart = useRef<Record<string, number>>({});
  const remainingTimes = useRef<Record<string, number>>({});

  const showNotification = useCallback(
    ({ title, message, type, copyText, durationMs }: ShowNotificationParams) => {
      const newNotification: NotificationMessage = {
        id: `${type}-${Date.now().toString()}`,
        title,
        message,
        type,
        isVisible: true,
        copyText,
        durationMs,
      };
      setNotifications((prev) => [...prev, newNotification]);

      const visibleMs = durationMs ?? DEFAULT_VISIBLE_MS;
      remainingTimes.current[newNotification.id] = visibleMs;
      startTimers(newNotification.id, visibleMs);
    },
    [],
  );

  const startTimers = useCallback(
    (id: string, visibleMs: number) => {
      if (visibleMs <= 0) {
        setNotifications(markRead(id));
        removeTimers.current[id] = window.setTimeout(() => {
          setNotifications(filterOut(id));
          cleanupRefs(id);
        }, EXIT_ANIMATION_MS);
        return;
      }

      timerStart.current[id] = Date.now();
      hideTimers.current[id] = window.setTimeout(() => {
        setNotifications(markRead(id));
      }, visibleMs);

      removeTimers.current[id] = window.setTimeout(() => {
        setNotifications(filterOut(id));
        cleanupRefs(id);
      }, visibleMs + EXIT_ANIMATION_MS);
    },
    [],
  );

  const clearTimers = useCallback((id: string) => {
    if (hideTimers.current[id]) {
      clearTimeout(hideTimers.current[id]);
      delete hideTimers.current[id];
    }
    if (removeTimers.current[id]) {
      clearTimeout(removeTimers.current[id]);
      delete removeTimers.current[id];
    }
  }, []);

  const cleanupRefs = (id: string) => {
    delete hideTimers.current[id];
    delete removeTimers.current[id];
    delete timerStart.current[id];
    delete remainingTimes.current[id];
  };

  const handlePause = useCallback(
    (id: string) => {
      clearTimers(id);
      const elapsed = Date.now() - (timerStart.current[id] ?? Date.now());
      const remaining = Math.max(
        0,
        (remainingTimes.current[id] ?? DEFAULT_VISIBLE_MS) - elapsed,
      );
      remainingTimes.current[id] = remaining;
      setPausedIds((prev) =>
        prev.includes(id) ? prev : [...prev, id],
      );
    },
    [clearTimers],
  );

  const handleResume = useCallback(
    (id: string) => {
      setPausedIds((prev) => prev.filter((entry) => entry !== id));
      const remaining = remainingTimes.current[id] ?? DEFAULT_VISIBLE_MS;
      startTimers(id, remaining);
    },
    [startTimers],
  );

  const handleCopy = useCallback((id: string, text: string) => {
    if (!text) return;
    if (!navigator?.clipboard) {
      console.warn("Clipboard API no disponible");
      return;
    }

    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedId(id);
        setTimeout(() => {
          setCopiedId((current) => (current === id ? null : current));
        }, 2000);
      })
      .catch((error) => {
        console.error("Error copiando notificación:", error);
      });
  }, []);

  useEffect(() => {
    return () => {
      Object.values(hideTimers.current).forEach((timerId) =>
        clearTimeout(timerId),
      );
      Object.values(removeTimers.current).forEach((timerId) =>
        clearTimeout(timerId),
      );
    };
  }, []);

  const contextValue = useMemo(() => ({ showNotification }), [showNotification]);

  return (
    <NotificationContext value={contextValue}>
      {children}
      <div className="notification-container">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification ${notification.isVisible ? "slide-in" : "slide-out"} ${
              pausedIds.includes(notification.id) ? "paused" : ""
            }`}
            onMouseEnter={() => handlePause(notification.id)}
            onMouseLeave={() => handleResume(notification.id)}
          >
            <div className="notification-card">
              <div className="notification-header">
                <StellarNotification
                  title={notification.title}
                  variant={
                    notification.type === "info" ? "secondary" : notification.type
                  }
                />
                {notification.copyText && (
                  <button
                    type="button"
                    className="notification-copy-btn"
                    onClick={() => handleCopy(notification.id, notification.copyText!)}
                  >
                    {copiedId === notification.id ? "Copiado" : "Copiar detalle"}
                  </button>
                )}
              </div>
              {notification.message && (
                <p className="notification-message">{notification.message}</p>
              )}
              <div
                className={`toast-progress ${
                  pausedIds.includes(notification.id) ? "paused" : ""
                }`}
                style={{
                  animationDuration: `${
                    notification.durationMs ?? DEFAULT_VISIBLE_MS
                  }ms`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </NotificationContext>
  );
};

function markRead(
  id: NotificationMessage["id"],
): React.SetStateAction<NotificationMessage[]> {
  return (prev) =>
    prev.map((notification) =>
      notification.id === id
        ? { ...notification, isVisible: false }
        : notification,
    );
}

function filterOut(
  id: NotificationMessage["id"],
): React.SetStateAction<NotificationMessage[]> {
  return (prev) => prev.filter((notification) => notification.id !== id);
}

export { NotificationContext };
export type { NotificationContextType };

