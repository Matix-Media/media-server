import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Relation, OneToOne, JoinTable, JoinColumn } from "typeorm";
import * as fs from "fs/promises";
import { MediaServer } from "..";
import path from "path";

@Entity()
export default class StreamPart extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @Column()
    playlist: boolean;
    @Column()
    has_subtitles: boolean;

    public async getPath(server: MediaServer) {
        return path.join(await server.getSaveDirectory("video"), this.id + (this.playlist ? ".m3u8" : ".ts"));
    }

    public async getData(server: MediaServer) {
        return await fs.readFile(await this.getPath(server));
    }
}
