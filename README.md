### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v20.x)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)

### Installation

1. Clone this repository:

   ```sh
   git clone git@github.com:konsulin-care/fe-konsulin.git

   cd fe-konsuin
   ```

2. Install the dependencies:

   ```sh
   yarn install
   # or
   npm install
   ```

### Development

To start the development server, run:

```sh
yarn dev
# or
npm run dev
```

### Deployment

- Build docker image (local).

```shell
bash build.sh -a ardi -u http://localhost:8080 -v develop
```

- Build docker image (develop).

```shell
bash build.sh -a ardi -u https://dev-api.konsulin.care -v develop
```

- Build docker container (production).

```shell
bash build.sh -a ardi -u https://dev-api.konsulin.care -v latest
```

- Run docker container (expose `network`).

```shell
docker run --name konsulin-app --rm -it --memory 512M --memory-swap 512M --network host konsulin/app:develop
```

- Test inside container

```shell
docker exec -it konsulin-app bash
```
