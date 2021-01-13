const assert = require('assert').strict;
const axios = require('axios');
const formData = require('form-data');
const https = require('https');
const fs = require('fs-extra');
const between = require('./between');
const jpeg = require(`jpeg-js`);

assert(process.env.MVI_USER, 'Please define env var MVI_USER');
assert(process.env.MVI_PASS, 'Please define env var MVI_PASS');
assert(process.env.MVI_ENDPOINT, 'Please define env var MVI_ENDPOINT');
assert(process.env.MVI_MODEL, 'Please define env var MVI_MODEL');

const MVIUsername = process.env.MVI_USER;
const MVIPassword = process.env.MVI_PASS;
const MVIEndpoint = process.env.MVI_ENDPOINT;
const MVIModel = process.env.MVI_MODEL;

module.exports.getToken = async () => {
  const options = {
    httpsAgent: new https.Agent({rejectUnauthorized: false}),
    method: 'POST',
    url: `${MVIEndpoint}/tokens`,
    data: {
      grant_type: 'password',
      username: MVIUsername,
      password: MVIPassword,
    },
  };
  return await axios(options).then((response) => response.data.token);
};

let token = null;
module.exports.detect = async (filePath, buffer, labels = [], thresholdScore = 0.0) => {
  if (token === null) {
    token = await module.exports.getToken();
  }

  let jpegData = buffer;
  if (!Buffer.isBuffer(buffer)) {
    jpegData = await fs.readFile(filePath);
  }
  const img = jpeg.decode(jpegData);

  const form = new formData();
  form.append('files', jpegData, {filepath: filePath});
  form.append('containHeatMap', 'false');
  form.append('containRle', 'false');
  form.append('containPolygon', 'false');
  form.append('confthre', thresholdScore);
  form.append('clsnum', 0);
  form.append('waitForResults', 'true');

  const options = {
    httpsAgent: new https.Agent({rejectUnauthorized: false}),
    method: 'POST',
    url: `${MVIEndpoint}/dlapis/${MVIModel}`,
    headers: {'X-Auth-Token': token, ...form.getHeaders()},
    data: form,
  };
  return await axios(options).then((response) => {
    if (response.data.result === 'success') {
      return response.data.classified.map((c) => {
        c.xmin = between(c.xmin, 0, img.width);
        c.xmax = between(c.xmax, 0, img.width);
        c.ymin = between(c.ymin, 0, img.height);
        c.ymax = between(c.ymax, 0, img.height);

        return {
          bbox: {
            xMin: c.xmin,
            xMax: c.xmax,
            yMin: c.ymin,
            yMax: c.ymax,
            top: c.ymin,
            left: c.xmin,
            width: c.xmax - c.xmin,
            height: c.ymax - c.ymin,
          },
          class: c.label, // deprecate.
          label: c.label,
          score: c.confidence,
          width: img.width,
          height: img.height,
        }
      }).filter((c) => labels.length > 0 ? labels.includes(c.label) : true);
    } else {
      return [];
    }
  }).catch((error) => {
    console.error('DETECT ERROR', error);
    return Promise.reject(error);
  });
};
