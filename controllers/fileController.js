const fs = require('fs');
const csv = require('csv-parser');

exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            console.log('CSV Data:', results);
            res.send('File uploaded and parsed successfully.');
        });
};
