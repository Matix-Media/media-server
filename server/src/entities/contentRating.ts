import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class ContentRating extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @Column()
    country: string;
    @Column()
    name: string;

    public static async getOrCreate(country: string, name: string) {
        let rating = await ContentRating.findOneBy({ country, name });
        if (rating) return rating;
        rating = new ContentRating();
        rating.country = country;
        rating.name = name;
        await rating.save();
        return rating;
    }
}
