/**
 * Production configuration for the School Management Mobile App
 * Optimized for production deployment with security and performance settings
 */

export default {
  expo: {
    name: "School Management - Teachers",
    slug: "school-management-teachers",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.schoolmanagement.teachers",
      buildNumber: "1.0.0",
      infoPlist: {
        NSCameraUsageDescription: "This app uses camera to capture photos for assignments and profile pictures.",
        NSPhotoLibraryUsageDescription: "This app accesses photo library to select images for assignments and profile pictures.",
        NSMicrophoneUsageDescription: "This app uses microphone for voice recordings in assignments.",
        CFBundleAllowMixedLocalizations: true,
        ITSAppUsesNonExemptEncryption: false
      },
      config: {
        usesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.schoolmanagement.teachers",
      versionCode: 1,
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECORD_AUDIO",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "WAKE_LOCK"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro"
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission: "Allow School Management to access your camera to take photos for assignments and profile pictures."
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Allow School Management to access your photos to select images for assignments and profile pictures.",
          savePhotosPermission: "Allow School Management to save photos to your photo library."
        }
      ],
      [
        "expo-document-picker",
        {
          iCloudContainerEnvironment: "Production"
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff",
          defaultChannel: "default"
        }
      ],
      [
        "expo-tracking-transparency",
        {
          userTrackingPermission: "This app uses tracking to provide personalized educational content and improve user experience."
        }
      ]
    ],
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: process.env.EAS_PROJECT_ID
      },
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      environment: "production",
      apiBaseUrl: process.env.API_BASE_URL,
      sentryDsn: process.env.SENTRY_DSN,
      amplitudeApiKey: process.env.AMPLITUDE_API_KEY,
      oneSignalAppId: process.env.ONESIGNAL_APP_ID,
      googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
      crashlyticsEnabled: true,
      performanceMonitoringEnabled: true,
      debugMode: false,
      logLevel: "error"
    },
    updates: {
      url: `https://u.expo.dev/${process.env.EAS_PROJECT_ID}`,
      enabled: true,
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 30000
    },
    runtimeVersion: {
      policy: "sdkVersion"
    },
    scheme: "schoolmanagement",
    experiments: {
      typedRoutes: true
    },
    owner: process.env.EXPO_OWNER || "your-organization"
  }
}
