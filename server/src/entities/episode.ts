import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, ManyToOne, Relation, OneToOne, JoinColumn } from "typeorm";
import Image from "./image";
import Season from "./season";
import Stream from "./stream";

@Entity()
export default class Episode extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @Column()
    name: string;
    @Column()
    episode_number: number;
    @Column()
    description: string;
    @ManyToOne(() => Image)
    @JoinColumn()
    poster: Relation<Image>;
    @Column()
    duration: number;
    @OneToOne(() => Stream)
    @JoinColumn()
    stream: Relation<Stream>;
    @ManyToOne(() => Season, (season) => season.episodes)
    season: Relation<Season>;
}
