import ytpl from "ytpl";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ytdl from "ytdl-core";
import fs from "fs";
import readline from "readline";
import { BatchPromise } from "./batch_promise";
import internal from "stream";

async function fetchingPlayList() {
  const ffmpegLocalPath = ffmpegPath.path;
  ffmpeg.setFfmpegPath(ffmpegLocalPath);

  let playListId = "PLKFO0Byvc1nRP7IJhROW9O0w0OcCqiD0L";

  const myPlayList = await ytpl(playListId, { pages: 9 });

  //   console.log(myPlayList.items.length);
  const batchPromise = new BatchPromise(
    myPlayList.items.length,
    async (index) => {
      const vidUrl = myPlayList.items[index].url;
      let vidInfo = await ytdl.getBasicInfo(vidUrl);
      const vidName = vidInfo.videoDetails.title;

      let stream = ytdl(vidUrl, {
        quality: "highestaudio",
      });

      await ffmpegSync(stream, vidName, index);
    }
  ).setBatchRange(50);

  await batchPromise.execute();
}

function ffmpegSync(
  input: string | internal.Readable,
  vidName: string,
  index: number
) {
  return new Promise((resolve, reject) => {
    const vidNameClr = vidName.replace(/[&\/\\#,+()$~%-.'":*?<>{}\|]/g, "");
    const path = `${__dirname}/downloaded/${vidNameClr}.mp3`;

    if (fs.existsSync(path)) {
      return resolve(null);
    }

    console.log(`${vidName} at ${index} failed`);

    ffmpeg(input)
      .audioBitrate(128)
      .save(path)
      .on("error", (p) => {
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`${vidName} at ${index} got ${p} \n`);
        return reject(new Error(p));
      })
      .on("end", () => {
        console.log(`${vidName} at ${index} download success`);
        return resolve(null);
      });
  });
}

fetchingPlayList()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
