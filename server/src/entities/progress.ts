import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToOne, OneToOne, PrimaryGeneratedColumn, Relation, UpdateDateColumn } from "typeorm";
import Episode from "./episode";
import Movie from "./movie";
import Profile from "./profile";
import Stream from "./stream";
import Watchable from "./watchable";

@Entity()
export default class Progress extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @Column()
    second: number;
    @Column({ default: false })
    finished: boolean;
    @ManyToOne(() => Episode)
    @JoinColumn()
    episode?: Relation<Episode>;
    @ManyToOne(() => Movie)
    @JoinColumn()
    movie?: Relation<Movie>;
    @ManyToOne(() => Stream, (stream) => stream.progresses)
    @JoinColumn()
    stream: Relation<Stream>;
    @ManyToOne(() => Watchable)
    watchable: Relation<Watchable>;
    @ManyToOne(() => Profile)
    @JoinColumn()
    profile: Relation<Profile>;
    @UpdateDateColumn()
    last_updates: Date;
}
