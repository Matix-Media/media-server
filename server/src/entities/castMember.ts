import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Relation, ManyToMany } from "typeorm";
import Watchable from "./watchable";

@Entity()
export default class CastMember extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @Column()
    tmdb_id: number;
    @Column()
    name: string;
    @Column({ type: "double" })
    popularity: number;
    @ManyToMany(() => Watchable, (watchable) => watchable.directors)
    director_in: Relation<Watchable[]>;
    @ManyToMany(() => Watchable, (watchable) => watchable.cast)
    cast_in: Relation<Watchable[]>;
    @ManyToMany(() => Watchable, (watchable) => watchable.writers)
    writer_in: Relation<Watchable[]>;

    public static async getOrCreate(tmdb_id: number, name: string, popularity: number) {
        let castMember = await CastMember.findOneBy({ tmdb_id: tmdb_id });
        if (castMember) return castMember;
        castMember = new CastMember();
        castMember.tmdb_id = tmdb_id;
        castMember.name = name;
        castMember.popularity = popularity;
        await castMember.save();
        return castMember;
    }
}
