import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Create a matcher for routes that require authentication
const isProtectedRoute = createRouteMatcher([
  '/api/protected(.*)',
  '/profile(.*)',
  '/dashboard(.*)',
])

export default clerkMiddleware((auth, req) => {
  // Only require authentication for protected routes
  if (isProtectedRoute(req)) {
    return auth().protect()
  }
  
  // For all other routes, authentication is optional
  return auth()
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
