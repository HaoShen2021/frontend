import Chunk, { ChunkInfo } from "./chunk";
import { localUploadChunk } from "../api";

export default class Local extends Chunk {
    protected async uploadChunk(chunkInfo: ChunkInfo) {
        return localUploadChunk(
            this.task.session?.sessionID!,
            chunkInfo,
            (p) => {
                this.updateChunkProgress(p.loaded, chunkInfo.index);
            },
            this.cancelToken.token
        );
    }
}
