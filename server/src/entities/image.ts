import { BaseEntity, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";
import * as fs from "fs/promises";
import { MediaServer } from "..";
import path from "path";
import { createWriteStream, write } from "fs";
import axios from "axios";
import sharp from "sharp";
import mimeTypes from "mime-types";

const imageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/tiff", "image/webp"];

@Entity()
export default class Image extends BaseEntity {
    @PrimaryGeneratedColumn("uuid")
    id: string;
    @Column({ nullable: true })
    type?: string;
    @Column({ nullable: true })
    source?: string;
    @CreateDateColumn()
    created_on: Date;

    public async getLocation(server: MediaServer) {
        const saveDirectory = await server.getSaveDirectory("image");
        const extension = this.type ? mimeTypes.extension(this.type) || "jpg" : "jpg";
        return path.join(saveDirectory, this.id + "." + extension);
    }

    public async getContent(server: MediaServer) {
        return await fs.readFile(await this.getLocation(server));
    }

    public static async fromURL(server: MediaServer, imageUrl: string) {
        // Check if image with that source already exists
        const existingImage = await Image.findOneBy({ source: imageUrl });
        if (existingImage) return existingImage;

        const image = new Image();
        image.source = imageUrl;

        const urlParts = imageUrl.split(".");
        let extension = urlParts.length > 0 ? "." + urlParts[urlParts.length - 1] : ".jpg";
        const mimeType = mimeTypes.lookup(extension) || "image/jpeg";
        extension = "." + (mimeTypes.extension(mimeType) || "jpg");
        image.type = mimeType;
        await image.save();

        const saveDirectory = await server.getSaveDirectory("image");
        server.mediaToolLogger.debug(`Downloading image[${image.id}] from "${imageUrl}"...`);
        const savePath = path.join(saveDirectory, image.id + extension);
        const writer = createWriteStream(savePath);
        const res = await axios.get(imageUrl, { responseType: "stream" });
        if (imageMimeTypes.includes(mimeType)) {
            const pipeline = sharp();
            if (mimeType == "image/jpeg") pipeline.jpeg();
            else if (mimeType == "image/png") pipeline.png();
            else if (mimeType == "image/gif") pipeline.gif();
            else if (mimeType == "image/tiff") pipeline.tiff();
            else if (mimeType == "image/webp") pipeline.webp();

            pipeline.pipe(writer);
            res.data.pipe(pipeline);
        } else {
            res.data.pipe(writer);
        }
        await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
        });

        server.mediaToolLogger.debug(`Successfully downloaded image[${image.id}]`);

        return image;
    }
}
