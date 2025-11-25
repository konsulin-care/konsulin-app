<p align="center" style="padding-top:20px">
 <img width="100px" src="https://github.com/konsulin-care/landing-page/raw/main/assets/images/global/logo.svg" align="center" alt="GitHub Readme Stats" />
 <h1 align="center">Konsulin App</h1>
 <p align="center">An open source digital wellness app</p>
</p>

<p align="center">
  <a href="https://github.com/konsulin-care/konsulin-app/releases"><img src="https://img.shields.io/github/v/release/konsulin-care/konsulin-app?style=flat" alt="GitHub release (with filter)"></a>
  <a href="https://github.com/konsulin-care/konsulin-app/actions"><img src="https://img.shields.io/github/actions/workflow/status/konsulin-care/konsulin-app/main.yml?style=flat" alt="GitHub Workflow Status (with event)"></a>
  <a href="https://hl7.org/fhir/R4"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.konsulin.care%2Ffhir%2Fmetadata&query=%24.fhirVersion&label=FHIR&color=red" alt="Blaze"></a>
  <a href="https://github.com/konsulin-care/konsulin-app/wiki"><img src="https://img.shields.io/badge/read%20the%20docs-here-blue?style=flat" alt="Docs"></a>
  <a href="https://feedback.konsulin.care"><img src="https://img.shields.io/badge/discuss-here-0ABDC3?style=flat" alt="Static Badge"></a>
</p>

## Architecture

- **FHIR Integration**: Blaze FHIR server for healthcare data storage (FHIR R4 compliant)
- **Authentication**: SuperTokens with magic link authentication
- **Frontend Framework**: Next.js with React and TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **Backend Integration**: Works alongside the [Konsulin API](https://github.com/konsulin-care/konsulin-app) as the API gateway

## Features

- **Psychological Instruments**: Access to various psychometric tools and assessments
- **Digital Interventions**: Evidence-based exercises for self-compassion, mindfulness, and mental health
- **Appointment Management**: Schedule and manage appointments with psychologists
- **Payment Gateway**: Secure payment processing for healthcare services
- **FHIR-Compliant Health Records**: Comprehensive health record management using FHIR R4 standards
- **Real-time Communication**: Messaging and notification system
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

## Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v20.x)
- [npm](https://www.npmjs.com/)

## Local Development Setup

### 1. Backend Service Setup

This frontend application requires the [Konsulin API backend service](https://github.com/konsulin-care/konsulin-app) to be running. Please follow the backend setup instructions first to ensure the API gateway is available.

### 2. Frontend Setup

1. Clone this repository:

   ```sh
   git clone git@github.com:konsulin-care/fe-konsulin.git
   cd fe-konsulin
   ```

2. Install the dependencies:

   ```sh
   npm install
   ```

3. Set up environment variables:
   - Copy the environment configuration file
   - Update the API endpoints to point to your local backend service

4. Start the development server:

   ```sh
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

### 3. Running Both Services

For full local development, ensure both services are running:

1. **Backend API**: Running on `http://localhost:8080` (or your configured port)
2. **Frontend**: Running on `http://localhost:3000`

The frontend will communicate with the backend API for all data operations, authentication, and FHIR resource management.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint for code quality checks
- `npm run format` - Format code using Prettier

## Technology Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Authentication**: SuperTokens
- **Data Fetching**: React Query
- **Form Management**: React Hook Form with Zod validation
- **Healthcare Standards**: FHIR R4 compliance
- **Development Tools**: ESLint, Prettier, Husky

## Contributing

1. Ensure both frontend and backend services are running locally
2. Follow the established coding standards and patterns
3. Test your changes across different user roles (patient, practitioner, admin)
4. Ensure FHIR compliance for any healthcare data operations

## License

Konsulin is distributed under the [AGPL-3.0 License](./LICENSE). **You may not use Konsulin's logo for other projects.** Commercial licenses are available for organizations that wish to use this software without AGPL obligations. Contact [hello@konsulin.care](mailto:hello@konsulin.care) to obtain a commercial license.
