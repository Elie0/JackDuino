const express = require('express');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const axios = require('axios');
const cors = require('cors');
const socketIo = require('socket.io');
//const localIP = '192.168.1.118';
const localIP = '192.168.185.103';



const vapidKeys = {
  publicKey: 'BKyb9hW4_7W3znqT1snpqH4zNFmvdBppRBqIOY-n32t18kyfW7j-RBBINg1yIUI-cPF82UQXnK0tuC_0UDEf2Cg',
  privateKey: '4ZvqZeiuksaGuzcS7Uo9Q12KdI47qwA0FyKkGBhHUTI'
};

webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);



const fs = require('fs');
var temp;
const app = express();
const port = 3000;
const server = require('http').createServer(app);
const io = require('socket.io')(server);
io.on('connection', () => { /* … */ });

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const subscriptions = []; // Store subscriptions here

app.post('/api/FallDetected', (req, res) => {
  const fallStatus = req.body.fallstatus;

  if (fallStatus===1) 
  {
    const notificationPayload ={
      notification: {
        title: 'Fall Detected',
        body: 'A fall has been detected.'
      } 
     
    };

    webpush.sendNotification(subscriptions[0],JSON.stringify(notificationPayload))

    // Send the push notification to all stored subscriptions
    // Promise.all(subscriptions.map(sub => webpush.sendNotification(
    //   sub, JSON.stringify(notificationPayload) )))
    //   .then(() => res.status(200).json({message: 'Newsletter sent successfully.'}))
    //   .catch(err => {
    //       console.error("Error sending notification, reason: ", err);
    //       res.sendStatus(500);
    //   })
  } 
});
// var fall
// app.post('/api/FallDetected', (req, res) => {
//   fall = req.body.fallstatus;
//   io.sockets.emit('fall',fall);
//   res.status(200).json({ fall});
// });


app.post('/api/subscribe', (req, res) => {
  subscriptions.push(req.body.subscription);

  // Store the subscription on your server for later use
  // You can save it to a database or an in-memory array
  // Example: subscriptions.push(subscription);
  console.log(subscriptions);
  res.status(201).json({ message: 'Subscription received and stored' });
});



app.post('/api/OxyHeart', (req, res) => {
  const HeartRate = req.body.heartRate;
  const OxyRate = req.body.spo2;
  console.log('Received Data:', HeartRate+" hbp ",OxyRate+" % ");
  io.sockets.emit('dataUpdate',{heartRate: HeartRate, spo2: OxyRate});
  res.status(200).json({ HeartRate});
});

app.post('/api/RoomTemp', (req, res) => {
  const temp = req.body.RoomTemp;
  console.log('RoomTemp:',temp);
  io.sockets.emit('roomtempUpdate',temp);
  res.status(200).json({ temp });
});

app.post('/api/GraphicalHeart', (req, res) => { 
  
  const data = req.body;
  console.log(data)
  const filepath = 'C:/Users/eliea/Desktop/All-IN-ONE-JACKET/all-in-one-jacket/src/assets/data.json';
  fs.readFile(filepath, 'utf8', (err, fileContent) => {
    if (err) {
      console.error('Error reading data file:', err);
      res.status(500).json({ error: 'Failed to read data file' });
    } else {
      let jsonDataArray = fileContent.trim().split('\n');
      // Keep only the latest 20 records
      if (jsonDataArray.length >= 40) {
        jsonDataArray = jsonDataArray.slice(jsonDataArray.length - 40);
      }
      // Append the new data to the filtered content
      jsonDataArray.push(JSON.stringify(data));
      const formattedData = jsonDataArray.join('\n');

      // Write the updated content back to the file
      fs.writeFile(filepath, formattedData, (err) => {
        if (err) {
          console.error('Error saving data:', err);
          res.status(500).json({ error: 'Failed to save data' });
        } else {
          console.log('Data saved to ' + filepath);
          res.json({ message: 'Data received and saved successfully' });
        }
      });
    }
  });
     
})

app.post('/api/update', (req, res) => {
  const temperature = req.body.temperature;
  io.sockets.emit('TempUpdate',temperature);
  console.log('Received temperature:', temperature);
  temp = temperature;

  res.status(200).json({ temperature });
});






server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


















  // const postData = {
  //   temperature: temperature,
  // };

  // const formData = querystring.stringify(postData);

  // const config = {
  //   headers: {
  //     'Content-Type': 'application/x-www-form-urlencoded',
  //   },
  // };

  // axios
  //   .post('https://data-server.cyclic.cloud/api/update', formData, config)
  //   .then((response) => {
  //     console.log('Server response:', response.data);
  //   })
  //   .catch((error) => {
  //     console.error('Error:', error.message);
  //   });
