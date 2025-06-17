# Project Architecture Documentation

## Overview

This is a full-stack web application built with Express.js backend and React frontend. The project uses modern development tools including Vite for build tooling, Drizzle ORM for database management, and Neon Database as the PostgreSQL provider. The application features a comprehensive UI component library based on Radix UI and Tailwind CSS for styling.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Components**: Extensive use of Radix UI primitives for accessible, unstyled components
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack React Query for server state management
- **Form Handling**: React Hook Form with resolvers for validation

### Backend Architecture
- **Runtime**: Node.js 20 with ES modules
- **Framework**: Express.js for REST API endpoints
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: PostgreSQL-based sessions using connect-pg-simple
- **Development**: tsx for TypeScript execution during development

### Database Strategy
- **Provider**: Neon Database (serverless PostgreSQL)
- **ORM**: Drizzle ORM with Zod integration for schema validation
- **Migrations**: Drizzle Kit for database schema management

## Key Components

### UI Component System
- Complete Radix UI component library including:
  - Navigation (menus, tabs, accordion)
  - Forms (inputs, selects, checkboxes, radio groups)
  - Feedback (dialogs, alerts, toasts, progress)
  - Layout (separators, scroll areas, aspect ratios)
  - Data display (avatars, hover cards, tooltips)
- Custom styling system with CSS custom properties for theming
- Dark mode support built into the design system

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Fast bundling for production server builds
- **Drizzle Kit**: Database schema management and migrations

## Data Flow

1. **Client Requests**: React frontend makes API calls to Express backend
2. **Server Processing**: Express routes handle business logic
3. **Database Operations**: Drizzle ORM manages PostgreSQL interactions
4. **Response Handling**: TanStack React Query manages client-side data caching and synchronization
5. **Session Management**: PostgreSQL-backed sessions for user authentication

## External Dependencies

### Database
- **Neon Database**: Serverless PostgreSQL provider
- **Connection**: @neondatabase/serverless for optimized serverless connections

### UI and Styling
- **Radix UI**: Comprehensive set of low-level UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Class Variance Authority**: For component variant management
- **Embla Carousel**: For carousel/slider functionality

### Development and Build
- **Vite**: Frontend build tool and dev server
- **ESBuild**: Backend bundling for production
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- **Port Configuration**: Server runs on port 5000, exposed externally on port 80
- **Hot Reload**: Development mode with automatic restart on file changes
- **Modules**: Uses Replit's nodejs-20, web, and postgresql-16 modules

### Production Build
- **Frontend**: Vite builds optimized static assets
- **Backend**: ESBuild bundles Node.js server into single file
- **Deployment**: Autoscale deployment target on Replit
- **Startup**: Production mode runs compiled JavaScript bundle

### Database Management
- **Schema Updates**: `npm run db:push` command for applying schema changes
- **Connection**: Serverless-optimized connection pooling through Neon

## Changelog

Changelog:
- June 17, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.