import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class Profile extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @Column()
    name: string;
}
