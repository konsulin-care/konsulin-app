# FE-KONSULIN DEPLOYMENT METHOD

**Production Workflow**

The "Production" GitHub Actions workflow automates the process of building and deploying a project to the production environment. It is triggered by either a manual dispatch or a push to any tagged commit.

**Development Workflow**

The  GitHub Actions workflow automates the process of containerizing and deploying a project on the `develop` branch. It can be triggered manually or by a push to the `develop` branch.

## WORKFLOW

The given GitHub Actions workflow is triggered by **a push to the `develop` branch.** The workflow consists of three jobs:

1. **Build**: Executes the `build.yml` workflow to build the project.

2. **Containerization**: Executes the `docker.yml` workflow to create a Docker container from the built project. It requires the `build` job to complete successfully.

3. **Deployment**: Executes the `deploy.yml` workflow to deploy the Docker container to a server. It requires the `docker` job to complete successfully. It uses SSH credentials and Docker credentials stored as GitHub secrets to deploy the application to the specified environment.

This GitHub Actions workflow, named "Deploy," is designed to facilitate the deployment of a service via SSH to a remote server. It is set up to be called by other workflows using the `workflow_call` event. Here’s a breakdown of its components:

## Build

The "Build" GitHub Actions workflow is designed to automate the process of building a Node.js project.

### Workflow Details

- **Job: Build**
  - **Runs on**: Uses a strategy matrix to define the environment, running on `ubuntu-latest` with Node.js version `20.16`.

- **Steps**:

  1. **Prepare Repository**:
     - Uses the `actions/checkout@v3` action to check out the code from the repository, preparing it for building.

  2. **Set Up Node.js**:
     - Uses the `actions/setup-node@v3` action to set up the Node.js environment based on the version specified in the matrix. It caches npm dependencies to speed up subsequent builds.

  3. **Installing Packages**:
     - Runs `npm ci` to install npm packages, ensuring a clean and reliable installation from the lock file.

  4. **Install Dependencies**:
     - Installs dependencies based on the lock file present (`yarn.lock`, `package-lock.json`, or `pnpm-lock.yaml`). If no lock file is found, the step fails.

  5. **Disable Next.js Telemetry**:
     - Sets an environment variable to disable telemetry in Next.js builds to prevent data collection.

  6. **Build Packages**:
     - Executes the build command using the appropriate package manager (`yarn`, `npm`, or `pnpm`) based on the lock file.

  7. **Upload Build Artifact**:
     - Uses `actions/upload-artifact@v3` to upload the build artifacts (contents of the `.next` and `public` directories) for later use in the workflow, with a retention period of 1 day.

This workflow streamlines the build process across different environments. It handles dependency installation and builds commands dynamically based on the project's configuration files.

## Containerization

The "Docker" GitHub Actions workflow automates the process of building and pushing a Docker image to a specified Docker registry.

### Workflow Details

- **Inputs**:
  - **API_URL**: The URL for the API endpoint used during the build process.
  - **VERSION**: The version of the build.
  - **GIT_COMMIT**: The Git commit hash.
  - **TAG**: The Git tag for the build.
  - **AUTHOR**: The author of the commit.
  - **RUN_NUMBER**: The run number of the workflow.
  - **BUILD_TIME**: The build timestamp.

- **Secrets**:
  - **DOCKER_USERNAME** and **DOCKER_PASSWORD**: Credentials for logging into the Docker registry.

### Jobs

#### Docker Job

- **Runs on**: Uses a strategy matrix to run on `ubuntu-latest`.

- **Steps**:

  1. **Prepare**:
     - Uses `actions/checkout@v2` to check out the code from the repository.

  2. **Download Artifacts**:
     - Uses `actions/download-artifact@v3` to download the build artifacts created in a previous step, storing them in the `build` directory.

  3. **Login to Registry**:
     - Uses `docker/login-action@v1` to log into the Docker registry `repository.konsulin.care` using the provided Docker credentials.

  4. **Get SHA Short**:
     - Extracts the first 8 characters of the Git commit SHA to create a short SHA, stored in the environment variable `SHORT_SHA`.

  5. **Get Branch**:
     - Extracts the branch name from the Git reference and stores it in the environment variable `BRANCH`.

  6. **Build**:
     - Executes the Docker build command to create a Docker image using the `docker/Dockerfile-ci` file. It tags the image with a name that includes the branch and short SHA, and passes several build arguments (e.g., `API_URL`, `VERSION`, etc.) to the build process.

  7. **Push SHA**:
     - Pushes the built Docker image to the specified registry with the tag `sha-${{ env.BRANCH }}-${{ env.SHORT_SHA }}`.

This workflow automates the Docker image creation and deployment process by pulling the latest build artifacts, building the Docker image with specific arguments, and pushing the image to a Docker registry for later use or deployment.

## Deployment

### Inputs and Secrets

- **Inputs**:
  - `ENVIRONMENT`: Specifies the deployment environment (e.g., development, production).
  - `SERVICE_NAME`: The name of the service to be deployed.

- **Secrets**:
  - SSH and Docker credentials are required for secure communication and authentication with the remote server and Docker registry.

### Jobs

#### Deploy Job

- **Runs on**: `ubuntu-latest`

- **Steps**:

  1. **Get SHA Short**:
     - Captures the first 8 characters of the Git commit SHA and stores it in the environment variable `SHORT_SHA`.

  2. **Get Branch**:
     - Extracts the branch name from the Git reference and stores it in the environment variable `BRANCH`.

  3. **Executing Remote SSH Commands**:
     - Uses the `appleboy/ssh-action` to connect to the remote server via SSH.
     - Changes directory to the specified environment path on the remote server.
     - Logs into the Docker registry using credentials.
     - Pulls the latest image for the specified service using a unique `COMMIT_HASH`.
     - Brings up the specified service using Docker Compose, applying updates or changes.

This workflow automates the deployment process, ensuring that the specified service is pulled and updated on the remote server, using Docker and SSH for secure operations.

