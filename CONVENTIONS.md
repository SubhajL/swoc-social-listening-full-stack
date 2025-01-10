# Conventions

## Developer Profile

### Proficiencies

- Expert full-stack developer
- TypeScript
- React
- Next.js
- Modern UI/UX frameworks

### Frameworks

- Tailwind CSS
- Shadcn UI
- Radix UI

### Objective

Produce the most optimized and maintainable Next.js code.

### Principles

- Best practices
- Clean code
- Robust architecture

---

## Project Type

### Language

TypeScript

### Runtime

Node.js

### Framework

Next.js

### Database

PostgreSQL

### Description

A Next.js application that serves both front-end and back-end, integrating with Firebase Firestore as the primary NoSQL database. It uses TypeScript for static typing, Firebase Authentication for security, and a custom data access layer rather than a traditional ORM.

### Features

- Server-Side Rendering (SSR) and Static Site Generation (SSG)
- Seamless integration of front-end (UI) and back-end (API routes) in one codebase
- Firebase Firestore for data storage, real-time updates, and scalability
- TypeScript for better tooling, maintainability, and safety
- DTO-based request/response contracts for clarity and stability
- Custom data access layer with Firestore SDK (no traditional ORM)
- Use of functional and declarative programming patterns
- Next.js server actions for server execution
- Optimized images and responsive design
- Modern UI frameworks integration
- Modern state management solutions

---

## Project Structure

### Description

Defines the directories and their responsibilities within the Next.js project.

### Directories

- **pages**

  Contains Next.js pages and API routes. UI pages (`.tsx`) for front-end rendering and `/api/` subdirectory for server-side routes acting as controllers.

  - **api**

    Houses server-side API endpoints. These routes act like controllers, handling HTTP requests, validating input with DTOs, and calling services for data operations.

- **components**

  Reusable UI components implemented as React functional components. No business or database logic—just presentation and user interaction.

- **models**

  TypeScript interfaces/types representing domain entities. Closely reflect Firestore documents but do not dictate request/response formats. Used internally in services.

- **services**

  Encapsulates business logic and data persistence. Each service focuses on a domain (e.g., `userService.ts`), interacts with Firestore via `lib`, and returns DTOs or model entities. No UI or HTTP logic here.

- **dto**

  Data Transfer Objects defining shapes of incoming requests and outgoing responses. Provide input validation, ensure strict contracts, and decouple internal models from external representations.

- **lib**

  Infrastructure code: Firebase/Firestore initialization and helper functions. For example, `firebase.ts` for app initialization, `firestore.ts` for Firestore instance and query helpers. No business logic.

- **utils**

  General-purpose helper functions, validators, formatters, and constants. Pure utility code with no side effects or business logic.

- **public**

  Static assets (images, icons, etc.) served directly.

- **styles**

  Global and component-level CSS or SCSS files for styling.

---

## Architecture

### Description

Layer-by-layer conventions and responsibilities.

### Layers

- **API Routes**

  - **Location**: `pages/api/`
  - **Responsibilities**:
    - Process HTTP requests (GET, POST, PUT, DELETE)
    - Validate request data using DTOs and utils
    - Call services for business logic and data retrieval
    - Return standardized JSON responses
    - No direct Firestore queries—delegate to services

- **Services**

  - **Location**: `services/`
  - **Responsibilities**:
    - Implement business logic
    - Interact with Firestore via `lib/firestore.ts`
    - Return entities (models) or DTOs
    - No UI or HTTP-specific logic

- **Models**

  - **Location**: `models/`
  - **Responsibilities**:
    - Define domain entities as TypeScript interfaces
    - Reflect Firestore documents
    - No methods, just properties
    - Used internally in services

- **DTO**

  - **Location**: `dto/`
  - **Responsibilities**:
    - Define request/response data structures
    - Validate and ensure contract stability
    - Contain only needed fields for external clients
    - Enable consistent APIs between front-end and back-end

- **Components**

  - **Location**: `components/`
  - **Responsibilities**:
    - UI composition and presentation
    - Fetch data via API routes
    - No direct database or service calls

- **Lib**

  - **Location**: `lib/`
  - **Responsibilities**:
    - Firebase and Firestore initialization
    - Low-level infrastructure and query helpers
    - No business logic

- **Utils**

  - **Location**: `utils/`
  - **Responsibilities**:
    - Pure utility functions
    - Validation, formatting, constants
    - No side effects or domain logic

---

## Coding Style

### Description

Coding standards, formatting rules, and naming conventions.

### Rules

- **Language Tooling**
  - Use TypeScript for all `.ts` and `.tsx` files
  - Enable `'strict'` mode in `tsconfig.json`
  - Use ESLint for linting and Prettier for formatting

- **Indentation and Whitespace**
  - Use 2 spaces per indentation level
  - No trailing whitespace
  - Use a single blank line for separation
  - Ensure newline at end of file (EOF)

- **Line Length**
  - Maximum 100 characters per line

- **Naming Conventions**
  - **Files and Directories**: `kebab-case` (e.g., `user-service.ts`, `user-controller.ts`)
  - **React Components**: `PascalCase` for component filenames (e.g., `UserList.tsx`)
  - **Classes and Interfaces**: `PascalCase` (e.g., `User`, `UserDTO`)
  - **Variables and Functions**: `camelCase`
  - **Constants**: `UPPER_CASE_SNAKE_CASE` (e.g., `MAX_PAGE_SIZE`)

- **Semicolons and Quotes**
  - Use single quotes for strings
  - End statements with semicolons

- **Imports and Exports**
  - Use named imports/exports where possible
  - Order imports: external -> internal -> relative
  - Sort imports alphabetically within groups

- **TypeScript Specifics**
  - Prefer explicit types for parameters and return values
  - Use interfaces for object shapes (DTOs, entities)
  - Use `readonly` for immutable properties

- **Functional Programming**
  - Use functional and declarative programming patterns; avoid classes
  - Favor iteration and modularization over code duplication
  - Use descriptive variable names with auxiliary verbs (e.g., `isLoading`, `hasError`)

- **File Structure**
  - Structure files with exported components, subcomponents, helpers, static content, and types
  - Use lowercase with dashes for directory names (e.g., `components/auth-wizard`)

- **Code Organization**
  - Write short functions following the single responsibility principle
  - Use Next.js server actions when possible to handle server execution on the server

---

## Best Practices

### Description

Recommendations for writing high-quality, maintainable code.

- **Controller**
  - Use unified response format `ResponseEntity<ApiResult>`
  - Add appropriate OpenAPI documentation annotations
  - Implement parameter validation
  - Apply permission controls

- **Service**
  - Encapsulate business logic
  - Manage transactions
  - Handle exceptions
  - Log operations

- **General**
  - Use unified exception handling
  - Follow Alibaba Java development standards
  - Add appropriate comments and documentation

### Optimization

- **Description**

  Optimization and best practices.

- **Rules**
  - Minimize the use of `'use client'`; prefer React Server Components (RSC) and Next.js SSR features
  - Implement dynamic imports for code splitting and optimization
  - Use responsive design with a mobile-first approach
  - Optimize images: use WebP format, include size data, implement lazy loading

---

## Error Handling, Logging, and Response Format

### Error Handling

- **Description**

  How errors are handled and returned.

- **Rules**
  - Catch errors at API route level
  - Log the error and return a standardized JSON error response
  - Use a consistent error response structure (`error.code`, `error.message`, `error.details`)
  - Do not expose sensitive or internal details in error messages
  - Handle known cases (e.g., not found, invalid input) with clear error codes
  - Prioritize error handling and edge cases
  - Use early returns for error conditions
  - Implement guard clauses to handle preconditions and invalid states early
  - Use custom error types for consistent error handling

### Logging

- **Description**

  Logging conventions.

- **Rules**
  - Use a structured logging library (e.g., `pino` or `winston`)
  - Log key events at `INFO` level
  - Log unexpected errors at `ERROR` level with stack traces
  - Include context (e.g., `userId`, `requestId`)
  - Do not log sensitive data

### Response Format

- **Description**

  Structure of successful and error responses.

- **Success Example**

  ```json
  {
    "data": {},
    "message": "Optional success message"
  }
  ```

- **Error Example**

  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Description",
      "details": "Additional info if needed"
    }
  }
  ```

- **Rules**
  - Return appropriate HTTP status codes (`4xx`/`5xx`) for errors with standardized error JSON
  - Include metadata for paginated or filtered results
  - Reflect authentication and authorization states in responses

---

## Documentation

### Description

Documentation and commenting standards.

### TSDoc

- **General**
  - Use TSDoc comments (`/** ... */`) for classes, functions, and interfaces

- **Controllers**
  - At the top of API route files, explain purpose, endpoints, and logic

- **Services**
  - Document what each service function does, its parameters, and return values

- **Models**
  - Document entity fields and Firestore-related notes

- **DTO**
  - Document property validation rules and purpose

- **Lib and Utils**
  - Document what queries or validations each function performs

### OpenAPI

- **Description**

  Use OpenAPI/Swagger if needed.

- **Rules**
  - Maintain an OpenAPI spec file mapping API routes
  - Document input/output DTOs, status codes, and authentication requirements
  - Keep the OpenAPI spec in sync with code in the CI/CD process

### Additional Documentation

- **Description**

  Extra documentation guidelines.

- **Rules**
  - Maintain a `/docs` directory for architecture overviews, ADRs, and FAQs
  - Add a `README` in key directories explaining their purpose
  - Ensure consistent naming and comments for automated documentation tools

---

## Security and Validation

### Description

Security and validation rules.

### Authorization and Authentication

- **Rules**
  - Use Firebase Authentication for user identification
  - Verify ID tokens server-side
  - Protected endpoints require valid credentials; return `401 Unauthorized` if not authorized
  - Implement role or claims-based checks as needed
  - Store minimal user info in Firestore; rely on Firebase rules and token verification

### Input Validation

- **Rules**
  - Validate incoming request data against DTO schemas (using `zod` or `yup`)
  - Return `400 Bad Request` with descriptive message if validation fails
  - Avoid `null` or `undefined` where not expected
  - Sanitize user input to prevent injection attacks

### Data Integrity and Security

- **Rules**
  - Enforce Firestore Security Rules for client access
  - Apply server-side checks for `userId` ownership
  - Encrypt sensitive data at rest if needed
  - Never log sensitive user details

---

## State Management and Data Fetching

### Description

State management and data fetching strategies.

### Rules

- Use modern state management solutions (e.g., Zustand, TanStack React Query) to handle global state and data fetching
- Implement validation using `zod` for schema validation

---

## UI and Styling

### Description

UI and styling conventions.

### Rules

- Use modern UI frameworks (e.g., Tailwind CSS, Shadcn UI, Radix UI) for styling
- Implement consistent design and responsive patterns across platforms

---

## Security and Performance

### Description

Security and performance optimization.

### Rules

- Implement proper error handling, user input validation, and secure coding practices
- Follow performance optimization techniques, such as reducing load times and improving rendering efficiency

---

## Usage Examples

### Description

Examples illustrating typical data flow.

### Data Flow Example

1. Client sends `POST /api/users` with JSON payload
2. API route validates input via `CreateUserDTO`, calls `userService.createUser()`
3. `userService.createUser()` uses `lib/firestore.ts` to insert a new user document, returns `UserDTO`
4. API route returns JSON with `UserDTO`
5. Front-end components fetch this endpoint and render the created user

---

## Enforcement

### Description

Ensuring rules are followed.

### Tools

- **ESLint** and **Prettier** for code style checks
- **Husky** and **lint-staged** for pre-commit validations
- Continuous Integration checks to ensure OpenAPI spec and docs are up-to-date

---

## Methodology

### Description

Approach to problem-solving and development processes.

### Principles

- **System 2 Thinking**

  Approach the problem with analytical rigor. Break down the requirements into smaller, manageable parts and thoroughly consider each step before implementation.

- **Tree of Thoughts**

  Evaluate multiple possible solutions and their consequences. Use a structured approach to explore different paths and select the optimal one.

- **Iterative Refinement**

  Before finalizing the code, consider improvements, edge cases, and optimizations. Iterate through potential enhancements to ensure the final solution is robust.

- **Code Preservation**

  **Do not**, repeat **do not** delete any chunks of code more than 10 lines. If you think it is necessary to do so, explain clearly your reasoning and provide a detailed analysis of the `context.md` file for the history of changes to ensure that you do not delete previously developed and tested functionalities.

### Process

#### Step-by-Step Approach

1. **Deep Dive Analysis**

   Begin by conducting a thorough analysis of the task at hand, considering the technical requirements and constraints.

2. **Planning**

   Develop a clear plan that outlines the architectural structure and flow of the solution, using `<PLANNING>` tags if necessary.

3. **Implementation**

   Implement the solution step-by-step, ensuring that each part adheres to the specified best practices.

4. **Review and Optimize**

   Perform a review of the code, looking for areas of potential optimization and improvement.

5. **Finalization**

   Finalize the code by ensuring it meets all requirements, is secure, and is performant.

---

## Context Review

### Description

Process for reviewing and updating `context.md`.

### Steps

1. **Review `context.md`**

   Review for relevant history or decisions related to the current feature or change.

2. **Plan Implementation**

   - **Considerations**:
     - Previous architectural decisions
     - Existing patterns and conventions
     - Potential impacts on other features

3. **Document Plan**

   - **Template**:
     - **Date**: `YYYY-MM-DD`
     - **Type**: `PLANNING`
     - **Description**: Brief description of planned implementation or change
     - **Technical Details**:
       - **Implementation Plan**: Numbered steps of implementation
       - **Affected Files**: List of files to be modified
     - **Considerations**:
       - **Previous Changes**: References to previous relevant entries
       - **Potential Impacts**: List of potential impacts
       - **Alternatives**: Alternative approaches considered
     - **Related Issues**: Links to related issues or PRs

4. **Update After Implementation**

   Document actual changes and deviations from the plan.

### Context Format

#### Sections

- **Purpose**:
  - Major architectural decisions
  - Important code changes
  - Feature implementations
  - Breaking changes
  - Refactoring decisions
  - Security considerations

- **Entry Types**:
  - `FEATURE`
  - `CHANGE`
  - `REFACTOR`
  - `SECURITY`
  - `BREAKING`
  - `PLANNING`

#### Entry Structure

- **Date**:
  - **Format**: `YYYY-MM-DD`
  - **Description**: Current date in `YYYY-MM-DD` format
  - **Example**: `2024-12-19`

- **Type**: One of the entry types (e.g., `FEATURE`, `CHANGE`)

- **Description**: Brief description of the change

- **Technical Details**:
  - **Implementation**: Details or steps of the implementation
  - **Affected Files**: List of files modified
  - **Dependencies**: List of dependencies or related components

- **Considerations**:
  - **Previous Changes**: References to prior related changes
  - **Trade-offs**: Any compromises made
  - **Alternatives**: Other approaches considered
  - **Impacts**: Effects on existing features or systems
  - **Future Implications**: Long-term considerations

- **Related Issues**: Links to related issues or pull requests
