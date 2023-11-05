const express = require('express');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const admin = require("firebase-admin")
const credentials = require('./key.json')
const io = require('socket.io')
const cors = require('cors');
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

admin.initializeApp({
  credential:admin.credential.cert(credentials)
});

const db = admin.firestore();

const fs = require('fs');
const app = express();
app.use(cors());
const port = 3000;
const server = require('http').Server(app);
const socketio = new io.Server(server,{
  cors: {
    origin: "*",
    handlePreflightRequest: (req, res) => {
      const headers = {
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS, HEAD"
      };
      res.writeHead(200, headers);
      res.end();
    }
  }
});
socketio.on('connection', () => { /* … */ });


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


    Promise.all(subscriptions.map(sub => webpush.sendNotification(
      sub, JSON.stringify(notificationPayload) )))
      .then(() => res.status(200).json({message: 'Newsletter sent successfully.'}))
      .catch(err => {
          console.error("Error sending notification, reason: ", err);
          res.sendStatus(500);
      })
  } 
});


app.post('/api/subscribe',  (req, res) => {
  subscriptions.push(req.body.subscription);

  // Store the subscription on your server for later use
  // You can save it to a database or an in-memory array
  // Example: subscriptions.push(subscription);
  console.log(subscriptions);
  res.status(201).json({ message: 'Subscription received and stored' });
});


app.post('/api/CreateFall',async(req,res)=>{

  try{
    const data = {
      fall: req.body.fallstatus
    };
    const response = await db.collection("Falls").add(data);
    res.send(response);
  }catch(err){
    res.send(error)
  }

})

app.get ('/api/ReadFall',async(req,res)=>{
  try{
    const usersRef = db.collection("Falls");
    const response = await usersRef.get();
    let responses  = [];
    response.forEach((fall)=>{
      responses.push(fall.data())
    })
    res.send(response)
  }
  catch(err){
    res.send(err)
  }
})

app.get ('/api/ReadFall/:id',async(req,res)=>{
  try{
    const usersRef = db.collection("Falls").doc(req.params.id);
    const response = await usersRef.get();
    res.send(response.data())
  }
  catch(err){
    res.send(err)
  }
})

app.post('/api/FallDetected', async (req, res) => {
  const fallStatus = req.body.fallstatus;

  if (fallStatus === 1) {
    const notificationPayload = {
      notification: {
        title: 'Fall Detected',
        body: 'A fall has been detected.'
      }
    };

    try {
      const subscribers = await fetchSubscribersFromDatabase();

      // Send notifications to subscribers
      await Promise.all(subscribers.map(sub => webpush.sendNotification(sub, JSON.stringify(notificationPayload))))

      res.status(200).json({ message: 'Notifications sent successfully.' });
    } catch (err) {
      console.error("Error sending notifications:", err);
      res.sendStatus(500);
    }
  }
});

async function fetchSubscribersFromDatabase() {
  try{
    console.log("reached!")
    const usersRef = db.collection("Falls");
    const response = await usersRef.get();
    let responses  = [];
    response.forEach((fall)=>{
      responses.push(fall.data())
    })
    console.log(responses)
    return(responses)
  }
  catch(err){
    console.log(err)
  }
}
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






server.listen( () => {
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
