const express = require('express');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const admin = require("firebase-admin")
const credentials = require('./key.json')
const axios = require('axios')
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
const io = require("socket.io")(server,{
  cors: {
    origin: "https://all-in-one-jacket.web.app",
    //origin: "http://localhost:4200",
  }
});
io.on('connection', () => (socket)=>{
  console.log("client connected",socket.id)
});


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const subscriptions = []; // Store subscriptions here

app.post('/api/FallDetected', async (req, res) => {
  const fallStatus = req.body.fallstatus;
  const apiUrl = 'https://jackback.onrender.com/api/subscriptions'; 
  var dataArray = [];

axios.get(apiUrl)
  .then((response) => {
    dataArray = [...dataArray, ...response.data];
    console.log('Data has been fetched and stored in dataArray:', dataArray);
  })
  .catch((error) => {
    console.error('Error fetching data:', error);
  });

  if (fallStatus === 1) {
    const notificationPayload = {
      notification: {
        title: 'Fall Detected',
        body: 'A fall has been detected.'
      }
    };

    try {
      
      await Promise.all(dataArray.map(sub => webpush.sendNotification(sub, JSON.stringify(notificationPayload))))


      res.status(200).json({ message: 'Notifications sent successfully.' });
    } catch (err) {
      console.error("Error sending notifications:", err);
      res.sendStatus(500);
    }
  }
});

app.get ('/api/subscriptions',async(req,res)=>{

  try{
    console.log("reached Step!!!!")
    const usersRef = db.collection("subscribers");
    const response = await usersRef.get();
    let responses  = [];
    response.forEach((fall)=>{
      responses.push(fall.data())
    })
    console.log(responses)
     res.send(responses)
  }
  catch(err){
    console.log(err)
  }

})

app.post('/api/subscribe',  async (req, res) => {

  try{
    const data = {
      subscriber: req.body.subscription
    };
    const response = await db.collection("subscribers").add(data);
    res.send(response);
  }catch(err){
    res.send(error)
  }


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
    res.send(responses)
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






server.listen( port, () => {
  console.log(`Server is running on port ${port}`);
});







