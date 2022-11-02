import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, Relation } from "typeorm";
import Watchable from "./watchable";

@Entity()
export default class IndexLog extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    filepath: string;

    @ManyToOne(() => Watchable)
    @JoinColumn()
    watchable?: Relation<Watchable>;

    @Column()
    indexing: boolean;

    @Column()
    failed: boolean;

    @Column({ type: "text" })
    error?: string;

    @CreateDateColumn()
    indexed_on: Date;
}
