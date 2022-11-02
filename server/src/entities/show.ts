import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Relation, OneToMany, OneToOne } from "typeorm";
import Season from "./season";
import Watchable from "./watchable";

@Entity()
export default class Show extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @OneToMany(() => Season, (season) => season.show)
    seasons: Relation<Season[]>;
    @OneToOne(() => Watchable, (watchable) => watchable.show_content)
    watchable: Relation<Watchable>;
    @Column()
    until_year: number;
}
