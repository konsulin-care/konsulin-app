# Architecture Overview: Konsulin Frontend

## System Architecture

The Konsulin frontend is a Next.js application, which inherently follows a React-based component architecture. It's a Single Page Application (SPA) with server-side rendering (SSR) capabilities provided by Next.js.

```mermaid
graph TD
    A[User Browser] --> B(Next.js Frontend);
    B --> C{API Gateway / Backend Services};
    C --> D[Authentication Service];
    C --> E[Data Service (FHIR)];
    C --> F[Other Microservices];

    B --> G(Components);
    B --> H(Pages);
    B --> I(API Routes - Next.js);
    G --> J(Radix UI / Tailwind CSS);
    H --> J;
    I --> C;
```

## Key Technical Decisions

- **Next.js**: Chosen for its SSR capabilities, file-system based routing, API routes, and optimized performance, which are crucial for a complex application like Konsulin.
- **React**: Provides a declarative and component-based approach to building user interfaces, enhancing reusability and maintainability.
- **TypeScript**: Ensures type safety, reducing runtime errors and improving code quality and developer experience.
- **Tailwind CSS**: A utility-first CSS framework for rapid UI development and consistent styling.
- **Radix UI**: Provides unstyled, accessible UI components that integrate well with Tailwind CSS, allowing for highly customizable and accessible interfaces.
- **NextAuth.js & Supertokens**: For robust and flexible authentication, supporting various authentication strategies, including user session and role management.
- **React Query**: For efficient data fetching, caching, and synchronization with the backend APIs.
- **FHIR Integration**: Utilizing `@aehrc/smart-forms-renderer` and `@types/fhir` for standardized healthcare data exchange and form rendering.
- **Docker**: For consistent development and deployment environments, ensuring portability and scalability.

## Design Patterns in Use

- **Component-Based Architecture**: UI is broken down into reusable, independent components.
- **Container/Presentational Pattern**: Separation of concerns between logic (containers) and UI rendering (presentational components).
- **Hook-based Logic**: Leveraging React Hooks for stateful logic and side effects within functional components.
- **API Layer Abstraction**: Services layer (`src/services/api`) to abstract API calls, promoting reusability and testability.
- **Context API / React Query**: For global state management and efficient data flow.

## Component Relationships

Components are organized hierarchically, with `src/components` housing reusable UI elements. Pages in `src/app` compose these components to form complete views. Context providers (`src/context`) manage global state accessible by various components.

## Critical Implementation Paths

- **Authentication Flow**: Secure user registration, login, session management, role-based access control, and logout, primarily managed by Supertokens.
- **Data Synchronization**: Efficiently fetching, updating, and caching healthcare data (FHIR resources) with the backend.
- **Appointment Booking**: Complex flow involving practitioner/clinic search, availability checking, and scheduling.
- **Dynamic Form Rendering**: Rendering and handling submissions of FHIR-based questionnaires and assessments.
- **Real-time Communication**: Implementation of messaging and notification features.
