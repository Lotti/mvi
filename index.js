const path = require('path');
const normalize = require('normalize-path');
const fs = require('fs-extra');
const fg = require('fast-glob');
const ora = require('ora');
const {drawBBoxOverImage} = require(`./helpers/image`);
const {detect} = require('./helpers/mvi');

const MIN_THRESHOLD = 0.5;

const dirname = process.cwd();
const PATH_IMG = path.join(dirname, 'images');
const PATH_DETECTIONS = path.join(dirname, 'detections');
const PATH_CANVAS = path.join(dirname, 'canvas');
const PATH_RESULTS = path.join(dirname, 'results');

const main = async () => {
  const spinner = ora({spinner: `dots`, hideCursor: true, text: `Working...`}).start();

  // clear and recreate folders
  await fs.remove(PATH_DETECTIONS);
  await fs.remove(PATH_CANVAS);
  await fs.remove(PATH_RESULTS);
  await fs.ensureDir(PATH_DETECTIONS);
  await fs.ensureDir(PATH_CANVAS);
  await fs.ensureDir(PATH_RESULTS);

  // loop over images
  const globOptions = {onlyFiles: true, deep: 0, absolute: true};
  const entries = await fg(normalize(path.join(PATH_IMG, `*.{jpg,jpeg}`)), globOptions);
  spinner.text = `Found ${entries.length} images`;
  let counter = 0;
  for (const entry of entries) {
    counter++;
    // compute file names
    const file = path.basename(entry);
    const fileName = path.basename(entry, path.extname(entry));
    spinner.text = `${file}: detecting... ${counter}/${entries.length}`;

    // obtain predictions on image
    try {
      // read image
      const buffer = await fs.readFile(entry);
      const predictions = await detect(entry, undefined, [], MIN_THRESHOLD);
      // store results
      const results = JSON.stringify(predictions, null, 2);
      fs.writeFile(path.join(PATH_RESULTS, `${fileName}.json`), results, {encoding: `utf8`});
      // store predictions
      const detections = formatPredictions(predictions);
      fs.writeFile(path.join(PATH_DETECTIONS, `${fileName}.txt`), detections, {encoding: `utf8`});

      // store image
      await drawImage(path.join(PATH_CANVAS, `${fileName}.jpg`), buffer, predictions);
      spinner.text = `${file}: Done! ${counter}/${entries.length}`;
    } catch (error) {
      console.error("error while detecting objects - waste", error);
      process.exit(1);
    }
  }
  spinner.succeed(`Done! ${entries.length}`);
}

const drawImage = (fileName, buffer, predictions) => {
  return new Promise((resolve, reject) => {
    drawBBoxOverImage(buffer, predictions).then((imageBuffer) => {
      const outResults = fs.createWriteStream(fileName);
      const writeStream = imageBuffer.pipe(outResults);
      writeStream.on(`close`, () => resolve());
      writeStream.on(`error`, (error) => reject(error));
    });
  });
};

const formatPredictions = (predictions, withoutScore = false) => {
  const lines = [];
  for (const p of predictions) {
    if (withoutScore) {
      lines.push(`${p.label} ${p.bbox.left} ${p.bbox.top} ${p.bbox.width} ${p.bbox.height}`);
    } else {
      lines.push(`${p.label} ${p.score} ${p.bbox.left} ${p.bbox.top} ${p.bbox.width} ${p.bbox.height}`);
    }
  }
  return lines.join(`\n`);
};

main().catch((error) => {
  console.error(error);
});
