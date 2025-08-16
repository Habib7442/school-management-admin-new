"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import LoginForm from "@/components/auth/LoginForm";

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    console.log('useEffect triggered - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user?.email, 'hasRedirected:', hasRedirected);

    // Reset redirect flag when authentication state changes
    if (isLoading) {
      setIsCheckingAuth(true);
      return;
    }

    setIsCheckingAuth(false);

    // Only proceed with redirect logic if we have a user and haven't redirected yet
    if (isAuthenticated && user && !hasRedirected) {
      console.log('Authentication check - User:', user.email, 'Role:', user.role, 'Onboarding completed:', user.onboarding_completed);

      // Check current path to prevent unnecessary redirects
      const currentPath = window.location.pathname;
      console.log('Current path:', currentPath);

      // Only redirect if we're on the root page ("/")
      // This prevents redirecting users away from specific admin pages on refresh
      if (currentPath !== '/') {
        console.log(`User is on ${currentPath}, not root page - no redirect needed`);
        setHasRedirected(true);
        return;
      }

      // Determine target path based on user role and onboarding status
      let targetPath = '';

      if (user.role === "admin" || user.role === "sub-admin") {
        // Admin/Sub-admin users
        if (!user.onboarding_completed) {
          targetPath = '/onboarding';
          console.log('Target: onboarding - onboarding not completed');
        } else {
          targetPath = '/admin';
          console.log('Target: admin dashboard - onboarding completed');
        }
      } else if (user.role === "teacher") {
        targetPath = '/dashboard';
        console.log('Target: teacher dashboard');
      } else if (user.role === "student") {
        targetPath = '/student';
        console.log('Target: student dashboard');
      } else {
        console.log('Unknown user role:', user.role, '- staying on login page');
        return; // Don't redirect for unknown roles
      }

      // Only redirect if we're not already on the target path
      if (currentPath !== targetPath) {
        console.log(`Redirecting from ${currentPath} to ${targetPath}`);
        setHasRedirected(true);

        // Use replace instead of push to prevent back button issues
        router.replace(targetPath);
      } else {
        console.log(`Already on target path ${targetPath}, no redirect needed`);
        setHasRedirected(true);
      }
    }

    // Reset redirect flag if user becomes unauthenticated
    if (!isAuthenticated && hasRedirected) {
      console.log('User became unauthenticated - resetting redirect flag');
      setHasRedirected(false);
    }
  }, [isAuthenticated, user, isLoading, router, hasRedirected]);

  // Show loading state while checking authentication
  if (isLoading || isCheckingAuth) {
    console.log('Showing loading state - isLoading:', isLoading, 'isCheckingAuth:', isCheckingAuth);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Checking authentication...</p>
          <p className="text-gray-500 text-sm mt-2">Please wait while we verify your session</p>
        </div>
      </div>
    );
  }

  // Show login form for unauthenticated users
  if (!isAuthenticated) {
    console.log('User not authenticated - showing login form');
    return <LoginForm />;
  }

  // If authenticated but no user data yet, show loading
  if (isAuthenticated && !user) {
    console.log('Authenticated but no user data - showing loading');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading user profile...</p>
        </div>
      </div>
    );
  }

  // If we have user and are authenticated, show loading while redirect happens
  if (isAuthenticated && user && !hasRedirected) {
    console.log('Authenticated with user data, preparing redirect...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  // Fallback: show login form (this should rarely happen)
  console.log('Fallback case - showing login form. State:', { isAuthenticated, user: !!user, hasRedirected });
  return <LoginForm />;
}
