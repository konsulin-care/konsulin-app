# FE-KONSULIN DEPLOYMENT METHOD

## Development Workflow

The GitHub Actions workflow automates the process of containerizing and deploying a project on the `develop` branch. It can be triggered manually or by a push to the `develop` branch.

## Production Workflow

The "Production" GitHub Actions workflow automates the process of building and deploying a project to the production environment. The step to deploy the production environment is by creating a release on the GitHub repository. This is the guide to create a release:

### Step 1: Create Release

This step is to create a release on the GitHub repository, when a new release is created, the `prod-build.yml` workflow will run a Docker build process to build and tag the release image directly on the server.

Step to create a release:

1. Go to the GitHub repository.
2. Click on the "Releases" tab.
3. Click on the "Draft a new release" button.
4. Enter the release tag name. Example: `v1.0.0`.
5. Name the release. Example: `v1.0.0`.
6. Ensure the release tag and release name are same.
7. Optionally, you can generate a release note automatically by clicking on the "Generate release notes" button.
8. Set the target branch to `develop` or trunk branch you want to deploy.
9. Set the release as a `Set as the latest release` option.
10. Click on the "Publish release" button.

### Rules

1. The allowed format for the release tag is `v1.0.0`.
2. The allowed format for the release name is `v1.0.0`.
3. Release name and release tag must be same.

### Example of Accpetable Release Name

- `v1.0.0`
- `v1.0.0-beta-1`
- `release-v1.0.0`

### Example of Not Acceptable Release Name

- `Release v1.0.0`
- `v1.0.0 Release`
- `v1.0.0-beta.1+build.123`
- `v1.0.0-beta.1`

### Step 2: Deploy a Release

This step is to deploy a release on the server, when a new release is created, the `prod-release.yml` workflow will run a deployment process.

Step to deploy a release:

1. Go to the GitHub Actions page.
2. Go to [Deploy Production](https://github.com/konsulin-care/fe-konsulin/actions/workflows/prod-release.yml) workflow.
3. Click on the `Run workflow` button.
4. Fill in the `RELEASE_NAME` input with the release name you want to deploy. See the example of correct release name above [here](#example-of-correct-release-name).
5. Click on the `Run workflow` button.

## WORKFLOW

1. **Containerization (Docker) on Self-Hosted Runner**

   - **Uses**: `docker-self-hosted.yml` workflow.
   - **Parameters**:
     - `API_URL`, TZ_ARG`,`AUTHOR`,`VERSION`,`GIT_COMMIT`,`BUILD_TIME`,`RUN_NUMBER`,`RELEASE_TAG`,`DOCKER_TAG`,`DOCKER_VENDOR_TAG`,`NODE_MODULES_CACHE_DIR`,`NEXTJS_CACHE_DIR`.
   - **Purpose**: Builds a Docker image directly on the server.

2. **Deployment**
   - **Uses**: `deploy-ansible.yml` workflow.
   - **Parameters**:
     - `DOCKER_TAG`, `ANSIBLE_PLAYBOOK`, `ANSIBLE_INVENTORY_HOSTS`.
   - **Secrets**: `SSH_KEY` to be used by Ansible.
   - **Purpose**: Deploys the Docker container to a remote server.

This workflow streamlines the process of building and deploying code changes to a development environment.

## Containerization (Docker) on Self-Hosted Runner

The "Docker (self-hosted)" GitHub Actions workflow automates the process of building the Docker image directly on the server, which at the same time working as the Self-Hosted Runner. The workflow is manifest file is `.github/workflows/docker-self-hosted.yml`.

### Input Parameters

To re-use the workflow, these are parameters needs to be defined:

- `AUTHOR`: Name of the commit author.
- `VERSION`: Version of the build.
- `GIT_COMMIT`: The Git commit hash.
- `BUILD_TIME`: The time the build was created.
- `RUN_NUMBER`: The workflow run number.
- `RELEASE_TAG`: The release tag.
- `DOCKER_TAG`: The Docker tag.
- `DOCKER_VENDOR_TAG`: The Docker vendor tag.
- `NODE_MODULES_CACHE_DIR`: The directory for the Node modules cache.
- `NEXTJS_CACHE_DIR`: The directory for the Next.js cache.

### Workflow Steps

1. **Prepare:** The workflow will clone the repository to the server.
2. **Set Up Node.js:** The workflow will set up the Node.js environment using the `actions/setup-node@v3` action.
3. **Generate Cache Key:** The workflow will generate a cache key based on the `NODE_MODULES_CACHE_DIR` and `NEXTJS_CACHE_DIR` inputs. The cache key is generated from hash file of either `yarn.lock`, `package-lock.json`, or `pnpm-lock.yaml`.
4. **Copy Cache:** The workflow will copy the cache from the previous run if the cache key matches.
5. **Installing Packages:** The workflow will install the packages using the appropriate package manager based on the lock file.
6. **Build Packages:** The workflow will build the packages using the appropriate package manager based on the lock file. This will buil the Next.js application.
7. **Update Node Modules Cache:** The workflow will update the cache with the newly built Node modules.
8. **Update Next.js Cache:** The workflow will update the cache with the newly built Next.js application.
9. **Modify .dockerignore:** The workflow will modify the `.dockerignore` file to exclude the `.next` and `public` directories from the Docker image. **Note**: This step is used because the build is not done in the `Dockerfile` but in the `docker-self-hosted.yml` workflow (directly on the server).
10. **Build Image:**: The workflow will build the Docker image using the `docker/Dockerfile-ci` and the modified `.dockerignore` file.

## Deployment (Ansible)

The "Deploy (Ansible)" GitHub Actions workflow automates the deployment of a service to a remote server using Ansible. The workflow is manifest file is `.github/workflows/deploy-ansible.yml`.

### Input Parameters

To re-use the workflow, these are parameters needs to be defined:

- `DOCKER_TAG`: The Docker tag. This is the Docker image tag that will be used to tag built image inside the server.
- `ANSIBLE_PLAYBOOK`: The Ansible playbook file.
- `ANSIBLE_INVENTORY_HOSTS`: The Ansible inventory hosts.
- `SSH_KEY`: The SSH key to be used by Ansible.

### Workflow Steps

1. **Prepare:** The workflow will prepare the environment by cloning the repository to the server.
2. **Run playbook:** The workflow will run the Ansible playbook using the input from `ANSIBLE_PLAYBOOK` and `ANSIBLE_INVENTORY_HOSTS` to deploy the service. On the playbook we define a variable with name `image_tag` with null value. The Ansible will replace the null value with the input from `DOCKER_TAG`. See Ansible official documentation for more details [Using Variables](https://docs.ansible.com/ansible/latest/user_guide/playbooks_variables.html#using-variables).

### Managing Ansible Variables

Refer to this [Deployment Scripts Documentation](https://github.com/konsulin-care/fe-konsulin/blob/develop/deployments/README.md) file for more information on how to manage Ansible variables.

## Deprecated

<details>
   <summary>Containerization (Docker) (Nexus Image Registry)</summary>
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

</details>

<details>
   <summary>Deployment (Docker Compose of Related Service on IaC Repository)</summary>
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

</details>
