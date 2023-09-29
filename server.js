const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
//const localIP = '192.168.1.5';
const app = express();
//const port = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var temp;

app.post('/api/update', (req, res) =>  {
  const temperature = req.body.temperature;
  // You can process the temperature data here (e.g., store it in a database)
  console.log('Received temperature:', temperature);
  temp = temperature;
  res.status(200).json({ temperature });
});

app.get('/api/temperature', (req, res) => {
  console.log(temp)
  res.json({ temp }); 
});

app.listen(port, /*localIP,*/ () => {
  console.log(`Server is running on port ${port}`);
});
