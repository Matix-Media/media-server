import { FastifyInstance, RegisterOptions } from "fastify";
import v1 from "./api/v1";

export default function (fastify: FastifyInstance, options: RegisterOptions, done: Function) {
    fastify.addHook("preHandler", (req, res, done) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "*");
        res.header("Access-Control-Allow-Headers", "*");
        done();
    });

    fastify.options("*", (req, res) => {
        return res.status(200).send();
    });

    fastify.register(v1, { prefix: "/api/v1" });

    done();
}
