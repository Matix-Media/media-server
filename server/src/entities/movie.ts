import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, Relation } from "typeorm";
import Stream from "./stream";
import Watchable from "./watchable";

@Entity()
export default class Movie extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @Column()
    duration: number;
    @OneToOne(() => Stream)
    @JoinColumn()
    stream: Relation<Stream>;
    @OneToOne(() => Watchable, (watchable) => watchable.movie_content)
    watchable: Relation<Watchable>;
}
