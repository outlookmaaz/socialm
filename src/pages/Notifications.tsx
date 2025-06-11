import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Sparkles, Clock } from 'lucide-react';

export function Notifications() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto relative h-[calc(100vh-60px)] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-pixelated text-lg font-medium">Notifications</h1>
              <p className="font-pixelated text-xs text-muted-foreground">
                Stay updated with your social activity
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Content */}
        <div className="flex flex-col items-center justify-center h-[calc(100vh-140px)] text-center p-6">
          <div className="relative mb-8">
            <div className="absolute -inset-4 bg-gradient-to-r from-social-green/20 to-social-blue/20 blur-xl rounded-full animate-pulse"></div>
            <div className="relative bg-background border-2 border-social-green/30 rounded-full p-8 shadow-lg">
              <Bell className="h-16 w-16 text-social-green mx-auto animate-float" />
              <div className="absolute -top-2 -right-2">
                <Sparkles className="h-6 w-6 text-social-blue animate-pulse" />
              </div>
            </div>
          </div>

          <Card className="max-w-md w-full card-gradient border-2 border-social-green/20 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-social-green" />
                <h2 className="font-pixelated text-xl font-bold social-gradient bg-clip-text text-transparent">
                  Coming Soon
                </h2>
              </div>
              
              <p className="font-pixelated text-sm text-muted-foreground leading-relaxed mb-6">
                We're working hard to bring you an amazing notification system! 
                Soon you'll be able to receive real-time updates for:
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 bg-social-green/10 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-social-green animate-pulse"></div>
                  <span className="font-pixelated text-xs">Friend requests & responses</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-social-blue/10 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-social-blue animate-pulse"></div>
                  <span className="font-pixelated text-xs">New messages & chats</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-social-purple/10 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-social-purple animate-pulse"></div>
                  <span className="font-pixelated text-xs">Likes & comments on posts</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-social-magenta/10 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-social-magenta animate-pulse"></div>
                  <span className="font-pixelated text-xs">Activity updates</span>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-pixelated text-xs text-muted-foreground">
                  Stay tuned for updates! This feature will be available very soon.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 flex items-center gap-2 text-muted-foreground">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-social-green animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-social-blue animate-pulse delay-150"></div>
              <div className="w-2 h-2 rounded-full bg-social-purple animate-pulse delay-300"></div>
            </div>
            <span className="font-pixelated text-xs">Building something amazing...</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Notifications;