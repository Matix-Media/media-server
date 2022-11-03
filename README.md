<p align="center">

<img src="https://github.com/Matix-Media/media-server/blob/master/client/public/favicon.svg?raw=true" height="256px" />

</p>

# Media Server (alpha)

A simple, beautiful, self-hosted media server.

## Installation

Clone this repository. Rename the `config.example.json` to `config.json` and adjust appropriate properties.

Make sure that the user as which the server gets run has read/write access to the `saveDirectory` and the `autoIndex.directory` directory.

Run the following command inside the directory to install all dependencies

```bash
$ yarn
```

After that, simply run

```bash
$ yarn build
```

to build the project.

## Running

Simply run to start the media server

```bash
$ yarn start
```

It is recommended to use a process manager like pm2 for managing the server instance. The file pm2 would need to run is located in: `server/dist/index.js`
