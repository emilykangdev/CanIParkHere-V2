I used Augment Code to analyze the codebase. It's awesome at that:

## Backend Design Patterns

### Architectural Patterns
1. **Clean Architecture** - Clear separation of concerns with `routes/`, `services/`, `core/`, `config/` layers
2. **Dependency Injection Container** - `ServiceContainer` in `core/dependencies.py` manages service lifecycles
3. **Repository Pattern** - Implied through service abstractions for data access
4. **Service Layer Pattern** - Business logic encapsulated in `services/` directory

### Structural Patterns
5. **Router Pattern** - FastAPI routers for modular endpoint organization
6. **Factory Pattern** - Service creation functions like `create_openai_service()`
7. **Singleton Pattern** - `@lru_cache` decorator ensures single service instances

````python path=backend/core/dependencies.py mode=EXCERPT
@lru_cache()
def get_service_container() -> ServiceContainer:
    """Singleton service container"""
````

### Behavioral Patterns
8. **Strategy Pattern** - Different processing methods (`image_api`, `search_api`) in `ParkingService`
9. **Template Method** - Service initialization patterns across different services
10. **Observer Pattern** - Structured logging with configurable processors

### Configuration Patterns
11. **Settings Pattern** - Pydantic Settings for centralized configuration
12. **Environment Variable Pattern** - Configuration through env vars with defaults

## Frontend Design Patterns

### Architectural Patterns
13. **Component-Based Architecture** - React components with clear separation
14. **Provider Pattern** - Context providers for global state (`PostHogProvider`, `ClerkProvider`)

````tsx path=my-clerk-app/src/app/layout.tsx mode=EXCERPT
<ClerkProvider>
  <PostHogProvider>
    {children}
  </PostHogProvider>
</ClerkProvider>
````

15. **Higher-Order Component (HOC)** - Clerk middleware wrapping
16. **Compound Component Pattern** - Complex UI components with multiple parts

### State Management Patterns
17. **Custom Hooks Pattern** - `useUserData`, `useLocation`, `useMap` for reusable logic
18. **State Lifting Pattern** - Shared state between `ParkingChatApp` and `ParkingMapView`

````tsx path=my-clerk-app/src/app/page.tsx mode=EXCERPT
const [currentView, setCurrentView] = useState<'map' | 'chat'>('map')
// State lifted to parent component
````

### UI Patterns
19. **Render Props Pattern** - Flexible component composition
20. **Conditional Rendering Pattern** - View switching logic
21. **Modal Pattern** - `UserProfileModal`, overlay components

### Data Flow Patterns
22. **Unidirectional Data Flow** - Props down, events up
23. **API Client Pattern** - Centralized API communication in `apiClient.ts`
24. **Type-Safe API Pattern** - TypeScript interfaces matching backend models

## Cross-Cutting Patterns

### Error Handling
25. **Exception Handler Pattern** - Centralized error handling on backend
26. **Error Boundary Pattern** - Frontend error containment (implied)

### Security Patterns
27. **Middleware Pattern** - Authentication, CORS, logging middleware
28. **Authentication Provider Pattern** - Clerk integration
29. **Route Protection Pattern** - Protected routes via middleware

### Observability Patterns
30. **Structured Logging Pattern** - JSON logging with context
31. **Analytics Pattern** - PostHog event tracking
32. **Health Check Pattern** - Service health endpoints

### Configuration Patterns
33. **Environment-Based Configuration** - Different configs per environment
34. **Feature Flag Pattern** - Settings-based feature toggles

### Type Safety Patterns
35. **Schema Validation Pattern** - Pydantic models on backend
36. **Type Definition Pattern** - Comprehensive TypeScript types
37. **API Contract Pattern** - Shared type definitions between frontend/backend

````typescript path=my-clerk-app/src/types/api.ts mode=EXCERPT
// Types matching backend Pydantic models
export interface ParkingCheckResponse {
  messageType: string;
  session_id: string;
  // ...
}
````

### Performance Patterns
38. **Lazy Loading Pattern** - Dynamic imports and code splitting
39. **Caching Pattern** - Service container caching, API response caching
40. **Optimization Pattern** - Image compression, web vitals tracking

This is (apparently) a "well-architected codebase with strong separation of concerns, type safety, and modern patterns throughout both frontend and backend!"
