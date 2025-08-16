# Deployment Guide

## Deploying to Vercel

This project uses a Turbo monorepo structure with the web app located in `apps/web`.

### Prerequisites

1. GitHub account
2. Vercel account (sign up at [vercel.com](https://vercel.com))
3. Supabase project with the database schema set up

### Step-by-Step Deployment

#### 1. Push to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

#### 2. Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect it's a monorepo

#### 3. Configure Build Settings

Vercel should auto-detect the settings, but verify:

- **Framework Preset**: Next.js
- **Root Directory**: `apps/web`
- **Build Command**: `cd ../.. && npm run build --filter=web`
- **Output Directory**: `apps/web/.next`
- **Install Command**: `npm install`

#### 4. Environment Variables

In Vercel dashboard, add these environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### 5. Deploy

Click "Deploy" and wait for the build to complete.

### Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Domains" tab
3. Add your custom domain
4. Update DNS records as instructed

### Troubleshooting

- **Build fails**: Check the build logs in Vercel dashboard
- **Environment variables**: Ensure all required env vars are set
- **Database connection**: Verify Supabase URL and keys are correct

### Production Checklist

- [ ] Environment variables configured
- [ ] Database schema deployed
- [ ] RLS policies enabled
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
