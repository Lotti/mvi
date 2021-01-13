# mvi

This program was built to do bulk inference on MVI api.

To install its dependencies, please run `npm install`.

In order to work, it requires valid MVI credentials and a deployed model id stored .env file (see .env.example)

Then, put the image you need to analyze inside the images folder and run the software with `npm start`.

Inference results will be created in txt format inside detections folder for every image. Objects bboxes will be stored in canvas folder and a copy of json data coming from MVI will be stored in results folder.