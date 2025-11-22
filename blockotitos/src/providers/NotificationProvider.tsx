import React, {
  createContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
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
interface NotificationMessage {
  id: string;
  title: string;
  message?: string;
  type: NotificationType;
  isVisible: boolean;
}

interface NotificationContextType {
  showNotification: (params: {
    title: string;
    message?: string;
    type: NotificationType;
  }) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const showNotification = useCallback(
    ({
      title,
      message,
      type,
    }: {
      title: string;
      message?: string;
      type: NotificationType;
    }) => {
      const newNotification: NotificationMessage = {
        id: `${type}-${Date.now().toString()}`,
        title,
        message,
        type,
        isVisible: true,
      };
      setNotifications((prev) => [...prev, newNotification]);

      setTimeout(() => {
        setNotifications(markRead(newNotification.id));
      }, 2500);

      setTimeout(() => {
        setNotifications(filterOut(newNotification.id));
      }, 5000);
    },
    [],
  );

  const contextValue = useMemo(() => ({ showNotification }), [showNotification]);

  return (
    <NotificationContext value={contextValue}>
      {children}
      <div className="notification-container">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification ${notification.isVisible ? "slide-in" : "slide-out"}`}
          >
            <div>
              <StellarNotification
                title={notification.title}
                variant={
                  notification.type === "info" ? "secondary" : notification.type
                }
              />
              {notification.message && (
                <p className="text-xs text-stellar-black/70 mt-1">{notification.message}</p>
              )}
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
        ? { ...notification, isVisible: true }
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
