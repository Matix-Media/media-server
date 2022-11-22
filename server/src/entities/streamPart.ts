import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Relation, OneToOne, JoinTable, JoinColumn, ManyToOne } from "typeorm";
import * as fs from "fs/promises";
import { MediaServer } from "..";
import path from "path";
import Stream from "./stream";

@Entity()
export default class StreamPart extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @ManyToOne(() => Stream, (stream) => stream.parts)
    stream: Relation<Stream>;
    @Column({ default: false })
    playlist: boolean;
    @Column()
    has_subtitles: boolean;

    public async getPath(server: MediaServer) {
        return path.join(await server.getSaveDirectory("video"), this.id + (this.playlist ? ".m3u8" : ".ts"));
    }

    public async getData(server: MediaServer) {
        return await fs.readFile(await this.getPath(server));
    }

    public async removeCompletely(server: MediaServer) {
        await fs.rm(await this.getPath(server));
        await this.remove();
    }
}
