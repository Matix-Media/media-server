import { FastifyInstance, RegisterOptions } from "fastify";
import v1 from "./api/v1";
import fastifyStatic from "@fastify/static";
import path from "path";

export default function (fastify: FastifyInstance, options: RegisterOptions, done: Function) {
    fastify.addHook("onSend", async (req, res) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "*");
        res.header("Access-Control-Allow-Headers", "*");
    });

    fastify.options("*", (req, res) => {
        return res.status(200).send();
    });

    fastify.register(v1, { prefix: "/api/v1" });

    const frontEndAppDir = path.resolve(path.join("../client/dist"));
    fastify.mediaServer.server.logger.debug("Front end app files located in:", frontEndAppDir);
    fastify.register(fastifyStatic, { root: frontEndAppDir, wildcard: false });
    fastify.get("*", async (req, res) => {
        return res.sendFile("index.html", frontEndAppDir);
    });

    done();
}
