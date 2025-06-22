# Replit.md - Meu Preço Certo

## Overview
Meu Preço Certo is a full-stack web application built with React (frontend), Node.js/Express (backend), and PostgreSQL (database). It's a subscription-based platform that integrates with Stripe for payment processing and uses comprehensive financial tracking systems. The application features user authentication, subscription management, email verification, and detailed payment analytics.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite
- **State Management**: TanStack Query for server state management
- **Forms**: React Hook Form with Zod validation
- **Payment UI**: Stripe React components for payment forms

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM with raw SQL queries for complex operations
- **Authentication**: Express-session with Passport.js
- **File Structure**: Modular approach with separate route handlers

### Database Architecture
- **Primary Database**: PostgreSQL (hosted on Locaweb/external provider)
- **Connection**: pg (node-postgres) with connection pooling
- **Schema Management**: Drizzle Kit for migrations
- **Key Tables**:
  - `users` - User accounts and authentication
  - `user_sessions` - Active session management
  - `pagamentos` - Payment records with detailed tracking
  - `assinaturas` - Subscription management
  - `planos` - Available subscription plans

## Key Components

### Authentication System
- Email/password authentication with session management
- Email verification system using nodemailer
- Multi-device session tracking with device fingerprinting
- Two-factor authentication support (configured but not fully implemented)
- Secure logout with session cleanup

### Payment Processing
- **Stripe Integration**: Complete webhook handling for payment events
- **Payment Tracking**: Detailed financial records including:
  - `valor` - Total payment amount
  - `valor_cartao` - Amount charged to card
  - `valor_credito` - Amount from credits
  - `credito_gerado` - Credits generated from payments
- **Subscription Management**: Support for upgrades, downgrades, and cancellations
- **Invoice Processing**: Automated invoice handling and payment reconciliation

### Email System
- **Provider**: Locaweb SMTP (email-ssl.com.br)
- **Features**: Account verification, password reset, payment notifications
- **Configuration**: SSL/TLS secured email delivery
- **Templates**: HTML email templates with professional styling

### Session Management
- Multi-device session tracking
- Real-time session monitoring
- Automatic cleanup of expired sessions
- Device-specific logout capabilities

## Data Flow

### User Registration Flow
1. User submits registration form
2. Account created with `email_verified: false`
3. Verification email sent via Locaweb SMTP
4. User clicks verification link
5. Account activated and session established

### Payment Processing Flow
1. User selects subscription plan
2. Stripe setup intent created for payment method
3. Payment method confirmed on frontend
4. Subscription created via Stripe API
5. Webhook processes payment completion
6. Payment record saved with detailed breakdown
7. User profile updated with new subscription

### Subscription Management Flow
1. User initiates plan change (upgrade/downgrade)
2. System calculates prorated amounts
3. Stripe subscription modified
4. Payment processed (may involve credits for downgrades)
5. Financial records updated with accurate values
6. User notified of changes

## External Dependencies

### Core Services
- **Stripe**: Payment processing and subscription management
- **Locaweb SMTP**: Email delivery service
- **PostgreSQL**: Primary database hosting

### Key Libraries
- **Payment**: @stripe/stripe-js, @stripe/react-stripe-js
- **Database**: drizzle-orm, pg
- **Authentication**: express-session, passport
- **Email**: nodemailer
- **Validation**: zod
- **UI**: @radix-ui components, tailwindcss

## Deployment Strategy

### Environment Configuration
- **Development**: Local PostgreSQL with Stripe test mode
- **Production**: External PostgreSQL with Stripe live mode
- **Ports**: 
  - Frontend: 3000 (internal), 3001 (external)
  - Backend: 5001 (internal), 3000 (external)

### Build Process
1. Frontend built with Vite to `dist/public`
2. Backend compiled with esbuild to `dist`
3. Static files served from Express

### Database Management
- Migrations handled via Drizzle Kit
- Connection pooling for performance
- Automated session cleanup processes

## Changelog
- June 14, 2025. Initial setup
- June 17, 2025. Successfully migrated from Replit Agent to standard Replit environment - all systems operational
- June 19, 2025. Implemented comprehensive WebSocket system with heartbeat monitoring for real-time client connections
- June 15, 2025. Fixed password change form behavior in "Minha Conta" security section - form now remains open when validation errors occur
- June 15, 2025. Fixed cancel button behavior in password change form - form now stays closed when user clicks cancel, preventing automatic reopening
- June 15, 2025. Added SITE_URL environment variable with current Replit domain for email verification and password reset links
- June 15, 2025. Fixed 2FA QR code generation - now correctly uses email of logged user instead of parent user

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Issues Fixed
- 2FA QR code was incorrectly generated using parent user's email instead of current logged user
- Modified all 2FA routes (/api/conta/2fa/iniciar, /api/conta/2fa/ativar, /api/conta/2fa/desativar, /api/conta/2fa/status) to distinguish between main users and additional users
- Added proper logic to identify isAdditionalUser and use correct email for QR code generation
- Fixed user authentication flow to respect additional user permissions in 2FA operations
- System now correctly handles 2FA for both main users and additional users with their respective emails
- Password change functionality was verifying parent user's password instead of logged user's password
- Modified /api/conta/alterar-senha route to detect user type and verify correct password
- For additional users: queries usuarios_adicionais table for password verification
- For main users: queries users table for password verification
- Password updates now target the correct table based of user type
- Session termination was failing due to incorrect user ID lookup for additional users
- Fixed DELETE /api/conta/sessoes/:sessionId to properly identify session ownership
- For additional users: searches sessions using their own ID in user_sessions_additional table
- For main users: searches sessions for themselves and their additional users
- Fixed foreign key constraint error in activity_logs by using parent user ID for additional users

## Project Execution Status (June 19, 2025)
- Successfully loaded complete cost management application
- All systems operational: PostgreSQL, Stripe, authentication, WebSocket
- Application running on Replit environment with external database connections
- Original project files restored per user request

## Session Termination Fix (June 19, 2025)
- Fixed session termination popup issue where modal only appeared on security tab
- Implemented robust DOM-based modal that forces display on any page when session is terminated
- Added direct WebSocket message interception in useWebSocket hook
- Modal now creates itself directly in DOM with countdown and automatic logout
- Enhanced logging to track session termination events across all pages
- Solution ensures popup appears regardless of current page or component state

## WebSocket Session Termination System
- Implemented comprehensive WebSocket notification system for automatic session disconnection
- Created SessionTerminatedModal component with 10-second countdown and automatic logout
- Updated WebSocketProvider to detect session_terminated messages and display notification modal
- Backend WebSocket infrastructure already broadcasts notifications when sessions are terminated
- Complete flow: user terminates session in security tab → WebSocket message sent → popup appears → automatic logout after countdown
- System properly handles user authentication in WebSocket connections for targeted notifications
- Session termination notifications work for both main users and additional users

## Filtered WebSocket Notification System (June 17, 2025)
- Implemented `notifyRelatedUsers` function to filter WebSocket notifications only to related users (parent and children)
- Replaced all data update notifications in endereços, contatos, and usuarios-adicionais endpoints
- System now prevents unnecessary notifications to unrelated users across multiple tabs
- Maintains instant synchronization between tabs for related users only
- Differentiates between 'session_terminated' (with popup) and 'data_update' (silent sync)
- Ensures optimal performance by targeting only relevant users for data updates

## WebSocket DOMException Fix Complete (June 22, 2025)
- Successfully resolved WebSocket DOMException errors caused by invalid URL construction in Replit environment
- Fixed issue where `window.location.port` returned `undefined` causing URLs like `wss://localhost:undefined/ws`
- Implemented dynamic SITE_URL detection system that automatically constructs correct URLs based on environment
- Added WebSocket interceptor in index.html that detects Replit/local environment and corrects URLs in real-time
- System now dynamically obtains correct domain from `window.location` instead of hardcoded values
- Enhanced error handling with automatic fallback URLs for both Replit and local development environments
- All WebSocket functionality now working properly: custom app WebSocket and Vite HMR WebSocket
- Solution automatically adapts to any Replit domain changes without manual intervention
- Added `/api/site-url` endpoint for future server-side URL provisioning if needed

## WebSocket Server Cleanup Complete (June 22, 2025)
- Successfully resolved duplicate WebSocket server conflicts causing port binding errors
- Removed all fragmented and duplicate WebSocket implementations from server/index.ts
- Maintained single, stable WebSocket server on `/ws` endpoint with full functionality
- WebSocket authentication system working correctly with both main and additional users
- Heartbeat monitoring system operational (30-second intervals)
- Real-time notifications functioning properly for related users
- Server architecture now clean with no port conflicts or duplicate services

## WebSocket Migration Complete (June 19, 2025)
- Successfully migrated entire "Minha Conta" page from TanStack Query to WebSocket-only architecture
- Created comprehensive `useWebSocketData` hook for unified data management across all account components
- Replaced all TanStack Query dependencies with real-time WebSocket notifications
- Implemented WebSocket versions for all account tabs:
  - Dados de Cadastro: Profile data using WebSocket with single-item handling
  - Endereços: Complete WebSocket implementation with real-time updates
  - Contatos: Full WebSocket integration with instant synchronization
  - Usuários Adicionais: WebSocket-based user management
- Removed all queryClient dependencies and TanStack Query imports from account page
- Enhanced WebSocket data handling to support both array and single-object resources
- All CRUD operations now use WebSocket notifications for instant cross-tab updates

## Session Termination Fix (June 17, 2025)
- Fixed critical bug in session deletion logic where sessions were not being deleted from correct tables
- Corrected logic to identify session type and delete from appropriate table:
  - Main user sessions deleted from `user_sessions` table
  - Additional user sessions deleted from `user_sessions_additional` table
- Enhanced session lookup to first check `user_sessions` table for main users before checking `user_sessions_additional`
- WebSocket notification system for session termination properly maintained
- Users now receive proper disconnection popup and automatic logout when sessions are terminated
- Session cleanup from Express session store and PostgreSQL session table also improved