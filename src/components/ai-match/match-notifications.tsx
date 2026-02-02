'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, X, MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatchNotification {
  id: string;
  matchedUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  matchScore: number;
  timestamp: Date;
  type: 'new_match' | 'mutual_like' | 'message_received';
}

interface MatchNotificationsProps {
  className?: string;
}

export function MatchNotifications({ className }: MatchNotificationsProps) {
  const [notifications, setNotifications] = useState<MatchNotification[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Simulate receiving notifications (in real app, this would come from WebSocket/Supabase real-time)
  useEffect(() => {
    const simulateNotification = () => {
      const mockNotification: MatchNotification = {
        id: Math.random().toString(36).substr(2, 9),
        matchedUser: {
          id: 'user-' + Math.random().toString(36).substr(2, 5),
          name: ['Alex', 'Sam', 'Jordan', 'Taylor', 'Casey'][Math.floor(Math.random() * 5)],
          avatar: undefined
        },
        matchScore: Math.floor(Math.random() * 30) + 70,
        timestamp: new Date(),
        type: 'new_match'
      };

      setNotifications(prev => [mockNotification, ...prev.slice(0, 4)]);
      setIsVisible(true);

      // Auto-hide after 5 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    };

    // Simulate random notifications for demo
    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance every 10 seconds
        simulateNotification();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (notifications.length <= 1) {
      setIsVisible(false);
    }
  };

  const dismissAll = () => {
    setNotifications([]);
    setIsVisible(false);
  };

  const getNotificationIcon = (type: MatchNotification['type']) => {
    switch (type) {
      case 'new_match':
        return <Heart className="w-5 h-5 text-pink-500" />;
      case 'mutual_like':
        return <Sparkles className="w-5 h-5 text-purple-500" />;
      case 'message_received':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Heart className="w-5 h-5 text-pink-500" />;
    }
  };

  const getNotificationTitle = (type: MatchNotification['type']) => {
    switch (type) {
      case 'new_match':
        return "It's a Match!";
      case 'mutual_like':
        return 'Mutual Like!';
      case 'message_received':
        return 'New Message';
      default:
        return "It's a Match!";
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 100 }}
          className={cn(
            "fixed bottom-6 right-6 z-50 max-w-sm w-full",
            className
          )}
        >
          <Card className="bg-white shadow-xl border-2 border-pink-200 overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getNotificationIcon(notifications[0].type)}
                    <h3 className="text-white font-bold text-lg">
                      {getNotificationTitle(notifications[0].type)}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={dismissAll}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {notifications.slice(0, 3).map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {notification.matchedUser.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {notification.matchedUser.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {notification.matchScore}% compatibility
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissNotification(notification.id)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </motion.div>
                ))}

                {notifications.length > 3 && (
                  <div className="text-center text-sm text-gray-600">
                    +{notifications.length - 3} more matches
                  </div>
                )}

                <div className="flex space-x-2 pt-2">
                  <Button size="sm" className="flex-1 bg-pink-600 hover:bg-pink-700">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Say Hello
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    View All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Celebration Animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 1,
                  scale: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{
                  opacity: 0,
                  scale: 1,
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 200,
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
                className="absolute top-1/2 left-1/2 w-2 h-2 bg-pink-400 rounded-full"
              />
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}