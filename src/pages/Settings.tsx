import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DeleteAccountDialog } from '@/components/user/DeleteAccountDialog';
import { Bell, Trash2, Settings as SettingsIcon, Smartphone, Zap, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export function Settings() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    requestPermission, 
    subscribe, 
    unsubscribe,
    sendTestNotification 
  } = usePushNotifications();

  const handleNotificationToggle = async () => {
    if (permission === 'granted') {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } else {
      await requestPermission();
    }
  };

  const handleAccountDeleted = () => {
    navigate('/login');
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-4 p-4 animate-fade-in">
        {/* Main Settings Card */}
        <Card className="card-gradient shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-social-green" />
              <CardTitle className="font-pixelated text-lg">Settings</CardTitle>
            </div>
            <CardDescription className="font-pixelated text-xs">
              Manage your account preferences and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Push Notifications Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-social-blue" />
                    <Label className="text-base font-pixelated">Push Notifications</Label>
                  </div>
                  <p className="text-sm text-muted-foreground font-pixelated">
                    Receive real-time notifications for messages and activities
                  </p>
                </div>
                <Switch
                  checked={permission === 'granted' && isSubscribed}
                  onCheckedChange={handleNotificationToggle}
                  disabled={!isSupported}
                />
              </div>
              
              {/* Notification Status */}
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-social-purple" />
                  <p className="text-sm font-medium font-pixelated">Notification Status</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-pixelated text-muted-foreground">
                    Browser Support: {isSupported ? '✅ Supported' : '❌ Not Supported'}
                  </p>
                  <p className="text-xs font-pixelated text-muted-foreground">
                    Permission: {permission === 'granted' ? '✅ Granted' : 
                                permission === 'denied' ? '❌ Denied' : '⏳ Not Requested'}
                  </p>
                  <p className="text-xs font-pixelated text-muted-foreground">
                    Subscription: {isSubscribed ? '✅ Active' : '❌ Inactive'}
                  </p>
                </div>
                
                {permission === 'granted' && (
                  <Button
                    onClick={sendTestNotification}
                    size="sm"
                    variant="outline"
                    className="mt-2 font-pixelated text-xs"
                  >
                    Send Test Notification
                  </Button>
                )}
              </div>
            </div>

            {/* Performance Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-social-orange" />
                <Label className="text-base font-pixelated">Performance</Label>
              </div>
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-pixelated">Cache Status</span>
                    <span className="text-xs font-pixelated text-green-600">✅ Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-pixelated">Service Worker</span>
                    <span className="text-xs font-pixelated text-green-600">✅ Registered</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-pixelated">Offline Support</span>
                    <span className="text-xs font-pixelated text-green-600">✅ Available</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy & Security Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-social-green" />
                <Label className="text-base font-pixelated">Privacy & Security</Label>
              </div>
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-pixelated">Data Encryption</span>
                    <span className="text-xs font-pixelated text-green-600">✅ Enabled</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-pixelated">Secure Connection</span>
                    <span className="text-xs font-pixelated text-green-600">✅ HTTPS</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-pixelated">Two-Factor Auth</span>
                    <span className="text-xs font-pixelated text-yellow-600">⏳ Coming Soon</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone Card */}
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive font-pixelated text-lg">Danger Zone</CardTitle>
            </div>
            <CardDescription className="font-pixelated text-xs">
              Irreversible actions that will permanently affect your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-destructive flex items-center gap-2 font-pixelated">
                  Delete Account
                </h3>
                <p className="text-sm text-muted-foreground mt-1 font-pixelated">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="font-pixelated hover-scale"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Info Card */}
        <Card className="bg-gradient-to-r from-social-green/10 to-social-blue/10">
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <img 
                src="/lovable-uploads/d215e62c-d97d-4600-a98e-68acbeba47d0.png" 
                alt="SocialChat" 
                className="h-12 w-auto mx-auto"
              />
              <h3 className="font-pixelated text-sm font-medium">SocialChat v1.0.0</h3>
              <p className="font-pixelated text-xs text-muted-foreground">
                Built with ❤️ by Mohammed Maaz A
              </p>
              <div className="flex justify-center gap-4 text-xs font-pixelated text-muted-foreground">
                <span>React 18</span>
                <span>•</span>
                <span>TypeScript</span>
                <span>•</span>
                <span>Supabase</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <DeleteAccountDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onAccountDeleted={handleAccountDeleted}
        />
      </div>
    </DashboardLayout>
  );
}

export default Settings;