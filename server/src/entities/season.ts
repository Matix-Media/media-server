import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, ManyToOne, Relation, OneToOne, JoinColumn, OneToMany } from "typeorm";
import Episode from "./episode";
import Image from "./image";
import Show from "./show";

@Entity()
export default class Season extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @Column()
    name: string;
    @Column()
    season_number: number;
    @Column()
    air_date: string;
    @Column({ length: 1000 })
    description: string;
    @ManyToOne(() => Image)
    @JoinColumn()
    poster: Relation<Image>;
    @OneToMany(() => Episode, (episode) => episode.season)
    episodes: Relation<Episode[]>;
    @ManyToOne(() => Show, (show) => show.seasons)
    show: Relation<Show>;
}
