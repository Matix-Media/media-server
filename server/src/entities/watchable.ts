import {
    BaseEntity,
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    Relation,
    OneToMany,
    ManyToMany,
    JoinTable,
    CreateDateColumn,
    Index,
    ManyToOne,
} from "typeorm";
import CastMember from "./castMember";
import ContentRating from "./contentRating";
import Genre from "./genre";
import Image from "./image";
import Movie from "./movie";
import Progress from "./progress";
import Show from "./show";

@Entity()
export default class Watchable extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @Column({ nullable: true })
    tmdb_id?: number;
    @Column()
    type: "show" | "movie";
    @Column()
    @Index({ fulltext: true })
    name: string;
    @Column({ length: 1000, nullable: true })
    @Index({ fulltext: true })
    description?: string;
    @Column({ nullable: true })
    year?: number;
    @Column({ nullable: true })
    creator?: string;
    @ManyToMany(() => Genre, (genre) => genre.watchables, { eager: true })
    @JoinTable()
    genres: Relation<Genre[]>;
    @ManyToMany(() => CastMember, (castMember) => castMember.cast_in)
    @JoinTable()
    cast: Relation<CastMember[]>;
    @ManyToMany(() => CastMember, (castMember) => castMember.director_in)
    @JoinTable()
    directors: Relation<CastMember[]>;
    @ManyToMany(() => CastMember, (castMember) => castMember.writer_in)
    @JoinTable()
    writers: Relation<CastMember[]>;
    @Column()
    quality: string;
    @Column({ type: "double", nullable: true })
    rating?: number;
    @Column({ default: false })
    adult: boolean;
    @ManyToMany(() => ContentRating, { eager: true })
    @JoinTable()
    content_ratings: Relation<ContentRating[]>;
    @ManyToOne(() => Image, { eager: true })
    @JoinColumn()
    poster?: Relation<Image>;
    @ManyToOne(() => Image, { eager: true })
    @JoinColumn()
    backdrop?: Relation<Image>;
    @ManyToOne(() => Image, { eager: true })
    @JoinColumn()
    logo?: Relation<Image>;
    @OneToOne(() => Movie, (movie) => movie.watchable, { eager: true })
    @JoinColumn()
    movie_content?: Relation<Movie>;
    @OneToOne(() => Show, (show) => show.watchable, { eager: true })
    @JoinColumn()
    show_content?: Relation<Show>;
    @OneToMany(() => Progress, (progress) => progress.watchable)
    @JoinColumn()
    progress: Relation<Progress[]>;
    @CreateDateColumn()
    created_on: Date;
}
