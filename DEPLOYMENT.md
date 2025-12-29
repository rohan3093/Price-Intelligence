# Deployment Guide

## Quick Deploy

This is a static React application that can be deployed to any static hosting service.

### Build for Production

```bash
npm install
npm run build
```

The production build will be in the `dist/` directory.

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

Or connect your GitHub repo to [Vercel](https://vercel.com) for automatic deployments.

### Deploy to Netlify

1. Install Netlify CLI: `npm i -g netlify-cli`
2. Run: `netlify deploy --prod --dir=dist`
3. Follow the prompts

Or drag and drop the `dist` folder to [Netlify Drop](https://app.netlify.com/drop).

### Deploy to GitHub Pages

1. Install gh-pages: `npm install --save-dev gh-pages`
2. Add to `package.json`:
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```
3. Run: `npm run deploy`

### Deploy to AWS S3 + CloudFront

1. Build: `npm run build`
2. Upload `dist/` contents to S3 bucket
3. Configure CloudFront distribution pointing to S3
4. Set up custom domain (optional)

## Environment Variables

Currently, no environment variables are required. All configuration is in code.

**For production**, consider moving these to environment variables:
- Analyst credentials (should be replaced with proper auth anyway)
- API endpoints (when backend is added)
- Feature flags

## Post-Deployment Checklist

- [ ] Verify all pages load correctly
- [ ] Test analyst login functionality
- [ ] Test responsive design on mobile devices
- [ ] Verify all images and fonts load
- [ ] Check browser console for errors
- [ ] Test asset search and filtering
- [ ] Verify design settings persist

## Custom Domain Setup

1. Configure DNS records (A/CNAME) pointing to your hosting service
2. Update hosting service with your domain
3. Enable HTTPS (usually automatic on Vercel/Netlify)
4. Update any hardcoded URLs if needed

## Performance Optimization

The build is already optimized with:
- Code minification
- Asset bundling
- Font optimization

For further optimization:
- Enable CDN caching
- Add service workers for offline support (PWA)
- Implement code splitting for large components

## Security Notes

⚠️ **Important**: The current implementation uses hardcoded analyst credentials. Before public launch:
1. Implement proper authentication (OAuth, JWT, or backend auth)
2. Move credentials to environment variables or secure backend
3. Add rate limiting for API calls (when backend is added)
4. Enable HTTPS (automatic on most hosting services)

---

**Last Updated**: $(date)

