import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Sparkles, Clock } from 'lucide-react';

export function Notifications() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto relative h-[calc(100vh-60px)] animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-background sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <Bell className="h-8 w-8 text-primary" />
            <div>
              <h1 className="font-pixelated text-2xl font-medium">Notifications</h1>
              <p className="font-pixelated text-sm text-muted-foreground">
                Stay updated with your social activity
              </p>
            </div>
          </div>
        </div>

        {/* Coming Soon Content - Centered for desktop */}
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-8">
          <div className="relative mb-12">
            <div className="absolute -inset-8 bg-gradient-to-r from-social-green/20 via-social-blue/20 to-social-purple/20 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative bg-background border-4 border-social-green/30 rounded-full p-12 shadow-2xl">
              <Bell className="h-24 w-24 text-social-green mx-auto animate-float" />
              <div className="absolute -top-4 -right-4">
                <Sparkles className="h-8 w-8 text-social-blue animate-pulse" />
              </div>
              <div className="absolute -bottom-2 -left-2">
                <Sparkles className="h-6 w-6 text-social-purple animate-pulse delay-300" />
              </div>
            </div>
          </div>

          <Card className="max-w-2xl w-full card-gradient border-4 border-social-green/20 shadow-2xl">
            <CardContent className="p-12 text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Clock className="h-6 w-6 text-social-green" />
                <h2 className="font-pixelated text-3xl font-bold social-gradient bg-clip-text text-transparent">
                  Coming Soon
                </h2>
              </div>
              
              <p className="font-pixelated text-base text-muted-foreground leading-relaxed mb-8 max-w-lg mx-auto">
                We're working hard to bring you an amazing notification system! 
                Soon you'll be able to receive real-time updates for:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-4 p-4 bg-social-green/10 rounded-xl border border-social-green/20">
                  <div className="w-3 h-3 rounded-full bg-social-green animate-pulse"></div>
                  <span className="font-pixelated text-sm">Friend requests & responses</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-social-blue/10 rounded-xl border border-social-blue/20">
                  <div className="w-3 h-3 rounded-full bg-social-blue animate-pulse"></div>
                  <span className="font-pixelated text-sm">New messages & chats</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-social-purple/10 rounded-xl border border-social-purple/20">
                  <div className="w-3 h-3 rounded-full bg-social-purple animate-pulse"></div>
                  <span className="font-pixelated text-sm">Likes & comments on posts</span>
                </div>
                <div className="flex items-center gap-4 p-4 bg-social-magenta/10 rounded-xl border border-social-magenta/20">
                  <div className="w-3 h-3 rounded-full bg-social-magenta animate-pulse"></div>
                  <span className="font-pixelated text-sm">Activity updates</span>
                </div>
              </div>

              <div className="bg-muted/50 p-6 rounded-xl border border-muted">
                <p className="font-pixelated text-sm text-muted-foreground">
                  Stay tuned for updates! This feature will be available very soon.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="mt-12 flex items-center gap-3 text-muted-foreground">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-social-green animate-pulse"></div>
              <div className="w-3 h-3 rounded-full bg-social-blue animate-pulse delay-150"></div>
              <div className="w-3 h-3 rounded-full bg-social-purple animate-pulse delay-300"></div>
            </div>
            <span className="font-pixelated text-sm">Building something amazing...</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Notifications;