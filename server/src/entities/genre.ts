import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, Relation, ManyToMany } from "typeorm";
import Watchable from "./watchable";

@Entity()
export default class Genre extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @Column()
    tmdb_id: number;
    @Column()
    name: string;
    @ManyToMany(() => Watchable, (watchable) => watchable.genres)
    watchables: Relation<Watchable[]>;

    public static async getOrCreate(tmdbId: number, name: string) {
        let genre = await Genre.findOne({ where: { tmdb_id: tmdbId } });
        if (genre) return genre;
        genre = new Genre();
        genre.tmdb_id = tmdbId;
        genre.name = name;
        await genre.save();
        return genre;
    }
}
