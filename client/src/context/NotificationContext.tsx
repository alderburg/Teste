import { createContext, useContext, useState, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

interface NotificationContextType {
  hasUnreadNotifications: boolean;
  unreadCount: number;
  setHasUnreadNotifications: (value: boolean) => void;
  setUnreadCount: (count: number) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [unreadCount, setUnreadCount] = useState(3); // Valor inicial para teste
  const { toast } = useToast();

  const markAllAsRead = () => {
    setHasUnreadNotifications(false);
    setUnreadCount(0);
    toast({
      title: "Notificações",
      description: "Todas as notificações foram marcadas como lidas",
      variant: "default",
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        hasUnreadNotifications,
        unreadCount,
        setHasUnreadNotifications,
        setUnreadCount,
        markAllAsRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}