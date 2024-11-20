# Deployment Scripts

This directory contains scripts for deploying the application to various environments.

## Prerequisites

- Ansible > 2.10 to run the playbooks and vault encryption. You can install Ansible by using the following command:

Using Homebrew:

```bash
brew install ansible
```

Using pip:

```bash
pip install ansible
```

Using apt:

```bash
sudo apt-get install ansible
```

Using Yum:

```bash
sudo yum install ansible
```

## Use Cases

### Docker Compose Manifest Template

The `templates/compose.yaml.j2` file is a template for generating a Docker Compose manifest file written with Jinja2 templating engine. The file contains placeholders for environment variables that need to be replaced with actual values before running the Docker Compose command.

### Ansible Variables

- `app_env`: The environment of the application. It can be `development`, `staging`, or `production`. It will be placed in the generated `.env` file.
- `ansible_user`: The user to be used by Ansible. It's the same user that Ansible use to connect to the remote server through SSH.
- `ansible_python_interpreter`: The Python interpreter to be used by Ansible. It's referencing the Python interpreter path on the remote server.
- `docker_service_name`: The name of the service to be deployed. It's the same name that defined in the `docker-compose.yml` file. If you need to change it, update the SWAG reverse proxy configuration file.
- `deployment_path`: The path to the deployment directory.
- `config_file_name`: The name of the configuration file. It will be used to generate the app config yaml file.
- `image_repository`: The repository of the Docker image.
- `image_tag`: The tag of the Docker image. We left it null on the playbook file. Everytime we ran deployment, we pass extra variable to the playbook to set the image tag.
- `logging.*`: The logging configuration for the Docker Compose service.
- `domain.*`: The domain configuration for the Docker Compose service.

## Example of Final Generated Configuration File

Example of `development` environment generated configuration file structure is like this:

```yaml
/home/konsulin/infrastructure/development/konsulin-app/
└── docker-compose.app.yaml
```

In the end of the Task, Ansible will run `docker-compose up -d` command to start the Docker Compose service.
