# Technologies and Frameworks: Konsulin Frontend

## Technologies and Frameworks Used

- **Next.js**: React framework for server-side rendering, static site generation, and API routes.
- **React**: JavaScript library for building user interfaces.
- **TypeScript**: Superset of JavaScript that adds static typing.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
- **Radix UI**: Unstyled, accessible UI component library.
- **NextAuth.js**: Authentication library for Next.js applications.
- **Supertokens**: Open-source authentication solution.
- **React Query (`@tanstack/react-query`)**: For data fetching, caching, and synchronization.
- **Axios**: Promise-based HTTP client for the browser and Node.js.
- **`@aehrc/smart-forms-renderer`**: For rendering FHIR-based smart forms.
- **`@types/fhir`**: TypeScript type definitions for FHIR.
- **`react-hook-form`**: For managing form state and validation.
- **Zod**: TypeScript-first schema declaration and validation library.
- **Docker**: For containerization and consistent environments.
- **Prettier**: Code formatter.
- **ESLint**: Pluggable linting utility for JavaScript and JSX.
- **Husky**: Git hooks for linting and formatting staged files.
- **`lint-staged`**: Run linters against staged git files.
- **`date-fns` / `dayjs`**: Date utility libraries.
- **`jwt-decode`**: For decoding JWT tokens.
- **`lucide-react`**: Icon library.
- **`cookies-next`**: Utility for handling cookies in Next.js.
- **`next-themes`**: Theme provider for Next.js.
- **`nextjs-toploader`**: Progress bar for Next.js page transitions.
- **`react-calendar` / `react-day-picker`**: Calendar and date picker components.
- **`react-markdown`**: Render Markdown as React components.
- **`react-qr-code`**: QR code generator.
- **`react-resizable-panels`**: Resizable panel components.
- **`react-share-social`**: Social sharing components.
- **`react-toastify`**: Notification library.
- **Sass**: CSS preprocessor.
- **Serwist (`@serwist/next`)**: Service worker library for PWAs.
- **Swiper**: Modern touch slider.
- **`uuid`**: For generating unique IDs.

## Development Setup

The project can be set up by cloning the repository, installing dependencies using `yarn install` or `npm install`, and starting the development server with `yarn dev` or `npm run dev`.

## Technical Constraints

- Node.js v20.x is required.
- The application is designed as a SPA with SSR capabilities.
- Integration with FHIR standards for healthcare data.

## Dependencies and Tool Configurations

- Dependencies are managed via `package.json`.
- Linting is configured with `.eslintrc.json` and `eslint-config-next`.
- Code formatting is handled by `.prettierrc` and `prettier-plugin-tailwindcss`, `prettier-plugin-organize-imports`.
- Git hooks are managed by Husky and `lint-staged` for pre-commit checks.
- Tailwind CSS configuration is in `tailwind.config.ts` (implied by `postcss.config.mjs` and `components.json`).

## Tool Usage Patterns

- `yarn dev` / `npm run dev`: For local development.
- `yarn build` / `npm run build`: For building the production-ready application.
- `yarn lint` / `npm run lint`: For linting code.
- `yarn format`: For formatting code.
- Docker commands are used for building and running containerized versions of the application for different environments.
