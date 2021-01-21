const {createCanvas, loadImage} = require(`canvas`);
const ColorHash = require(`color-hash`);
const colorHash = new ColorHash();
const alpha = 0.33;

module.exports.decodeJPG = (file) => {
    return loadImage(file).then((image) => {
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext(`2d`);
        ctx.drawImage(image, 0, 0, image.width, image.height);
        const data = ctx.getImageData(0, 0, image.width, image.height);
        return {data: new Uint8Array(data.data), width: data.width, height: data.height};
    });
};

const perc = (x) => Math.round(parseFloat(x) * 100);

const drawBox = (ctx, label, bbox) => {
    if (bbox.polygons && Array.isArray(bbox.polygons) && bbox.polygons.length > 0) {
        for (const polygon of bbox.polygons) {
            drawPolygon(ctx, label, polygon);
        }
    } else {
        const color = colorHash.rgb(label);
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
        ctx.rect(bbox.left, bbox.top, bbox.width, bbox.height);
        ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
        // ctx.fillRect(bbox.left, bbox.top, bbox.width, bbox.height);
        ctx.stroke();
    }
};

const drawPolygon = (ctx, label, points) => {
    const color = colorHash.rgb(label);
    ctx.strokeStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
    ctx.fill();
};

const drawLabel = (ctx, imageWidth, label, left, top, text) => {
    const color = colorHash.rgb(label);
    ctx.font = `12px Arial`;
    const verticalPadding = 6;
    const horizontalPadding = 1;
    const labelMeasure = ctx.measureText(text || label);
    ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
    if (left + labelMeasure.width < imageWidth) {
        ctx.fillRect(left, top, labelMeasure.width + horizontalPadding * 2, 12 + verticalPadding);
        ctx.fillStyle = `white`;
        ctx.fillText(text || label, left + horizontalPadding, top + verticalPadding * 2);
    } else {
        ctx.fillRect(imageWidth - labelMeasure.width, top, labelMeasure.width + horizontalPadding * 2, 12 + verticalPadding);
        ctx.fillStyle = `white`;
        ctx.fillText(text || label, imageWidth - labelMeasure.width + horizontalPadding, top + verticalPadding * 2);
    }
};

module.exports.drawBBoxOverImage = async (file, objects, labelField = `label`, bboxField = `bbox`, scoreField = `score`) => {
    return module.exports.drawBBoxOverImageObjects(file, {objects, objLabelField: labelField, objBboxField: bboxField, objScoreField: scoreField});
};
module.exports.drawBBoxOverImageObjects = async (file, {objects = [], objLabelField = `label`, objBboxField = `bbox`, objScoreField = `score`, classifications = [], claNameField = `name`, claClassField = `class`, claScoreField = `score`}) => {
    // create canvas and load image
    const image = await loadImage(file);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext(`2d`);
    ctx.drawImage(image, 0, 0, image.width, image.height);

    if (Array.isArray(classifications) && classifications.length > 0) {
        const classificationLabel = classifications.map(c => {
            const name = c[claNameField];
            const className = c[claClassField];
            const score = c[claScoreField];
            return `${name}-${className}: ${perc(score)}`;
        }).join(` | `);

        if (classificationLabel.length > 0) {
            drawLabel(ctx, image.width, classificationLabel, 5, 5);
        }
    }

    if (Array.isArray(objects) && objects.length > 0) {
        // draw rects on canvas
        objects.forEach((p) => {
            const bbox = p[objBboxField];
            const label = p[objLabelField];
            const extra = p.extra ? ` ${p.extra}` : '';
            drawBox(ctx, label+extra, bbox);
        });

        // draw labels over rects on canvas
        objects.forEach((p) => {
            const bbox = p[objBboxField];
            const label = p[objLabelField];
            const extra = p.extra ? ` ${p.extra}` : '';
            const score = p[objScoreField] ? ` score ${perc(p[objScoreField])}` : ``;
            const iou = Object.prototype.hasOwnProperty.call(p, `iou`) ? ` iou ${perc(p.iou)}` : ``;
            drawLabel(ctx, image.width, label+extra, bbox.left, bbox.top, `${label}${extra}${iou}${score}`);
        });
    }

    return canvas.createJPEGStream();
};
