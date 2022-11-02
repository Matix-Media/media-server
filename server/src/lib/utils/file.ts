import * as fs from "fs/promises";
import path from "path";

export default {
    async fileExists(path: string) {
        try {
            const stats = await fs.stat(path);
            return stats.isFile();
        } catch {
            return false;
        }
    },

    async getAllFilesRecursive(directoryPath: string, files?: string[]): Promise<string[]> {
        const currentFiles = await fs.readdir(directoryPath);
        files = files || [];

        for (const file of currentFiles) {
            const currentFile = path.join(directoryPath, file);
            if ((await fs.stat(currentFile)).isDirectory()) {
                files = await this.getAllFilesRecursive(currentFile, files);
            } else {
                files.push(currentFile);
            }
        }

        return files;
    },
};
