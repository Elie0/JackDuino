const express = require('express');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const cors = require('cors');

const vapidKeys = {
  publicKey: 'BKyb9hW4_7W3znqT1snpqH4zNFmvdBppRBqIOY-n32t18kyfW7j-RBBINg1yIUI-cPF82UQXnK0tuC_0UDEf2Cg',
  privateKey: '4ZvqZeiuksaGuzcS7Uo9Q12KdI47qwA0FyKkGBhHUTI'
};

webpush.setVapidDetails(
  'mailto:example@yourdomain.org',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);



const dotenv = require('dotenv')
dotenv.config({ path: `${__dirname}/Config.env` });
const admin = require("firebase-admin")
admin.initializeApp({
  credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,   
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,   
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')   
  }),
});

const db = admin.firestore();
const WebSocket = require('ws');
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




// Push Notification Api's

app.get ('/api/subscriptions',async(req,res)=>{

  try{
    console.log("reached Step!!!!")
    const usersRef = db.collection("subscribers");
    const response = await usersRef.get();
    let responses  = [];
    response.forEach((fall)=>{
      responses.push(fall.data())
    })
     res.send(responses)
  }
  catch(err){
    console.log(err)
  }

})


app.post('/api/subscribe',  async (req, res) => {

  try{
    const data =  req.body.subscription
    const response = await db.collection("subscribers").add(data);
    res.send(response);
  }catch(err){
    res.send(error)
  }

});


async function fetchSubscribersFromDatabase() {
  try{
    console.log("reached Step!!!!")
    const usersRef = db.collection("subscribers");
    const response = await usersRef.get();
    let responses  = [];
    response.forEach((fall)=>{
      responses.push(fall.data())
    })
    return(responses)
  }
  catch(err){
    console.log(err)
  }
}


// Fall Detection Api's



app.post('/api/FallDetected', async (req, res) => {
  const fallStatus = req.body.fallstatus;
  const currentDate =  new Date();
  const formattedTime = currentDate.toLocaleString('en-US',{
    timeZone:'EET'
  });
  const formattedDate = currentDate.toDateString();
  const IsoData = formattedTime.split(',')
  const Isod = currentDate.toISOString().split('T')[0];
  const IsoTime = IsoData [1]
  console.log(formattedDate+ " " + formattedTime)

  const FallEvent = {
      IsoDate: Isod,
      Date:formattedDate,
      Time:IsoTime
  }
  try{ const response = await db.collection("Falls").add(FallEvent);

}
 catch(err){
  console.log(err)
}

  if (fallStatus === 1) {

    const notificationPayload = {
      notification: {
        title: 'Fall Detected',
        body: 'A fall has been detected.'
      }
    };

    try {
      const subscribers = await fetchSubscribersFromDatabase();
     await Promise.all(subscribers.map(sub => webpush.sendNotification(sub, JSON.stringify(notificationPayload))))
      res.status(200).json({ message: 'Notifications sent successfully.' });
    } catch (err) {
      console.error("Error sending notifications:", err);
      res.sendStatus(500);
    }
  }
});


app.get ('/api/ReadFall',async(req,res)=>{
  try{
    const usersRef = db.collection("Falls");
    const response = await usersRef.get();
    let responses  = [];
    response.forEach((fall)=>{
      responses.push(fall.data())
    })
    console.log("Falls",responses)
    res.send(responses)
  }
  catch(err){
    res.send(err)
  }
})

  app.get('/api/ReadFall/:StartDate/:EndDate', async (req, res) => {
    const start = req.params.StartDate;
    console.log(start);
    const end = req.params.EndDate;
    console.log(end);
    const query = db.collection('Falls')
      .where('IsoDate', '>=', start)
      .where('IsoDate', '<=', end);

    try {
      const getQuery = await query.get();
      const falls = [];

      getQuery.forEach((doc) => {
        falls.push(doc.data());
      });

      res.json(falls);
    } catch (err) {
      console.error(err);
      res.send(err);
    }
  });



// Heart And Oxygen API



app.post('/api/OxyHeart', (req, res) => {
  const HeartRate = req.body.heartRate;
  const OxyRate = req.body.spo2;
  console.log('Received Data:', HeartRate+" hbp ",OxyRate+" % ");
  io.sockets.emit('dataUpdate',{heartRate: HeartRate, spo2: OxyRate});
  res.status(200);
});

// ECG Api's

app.post('/api/ECG', (req, res) => {
  const DataArray = req.body.heartRate;
  console.log('Received Data:', DataArray);
  io.sockets.emit('ECG',DataArray);
  res.status(200);
});



app.post('/api/SaveECG', async (req, res) => {
  const { name, points } = req.body;

  console.log('Received data:', { name, points });

  try {
  
    const existingDoc = await db.collection("ECG").doc(name).get();

    if (existingDoc.exists) {
      console.log('yes')
      res.json({ success: false, error: 'Document with the same name already exists' });
    } else {
      await db.collection("ECG").doc(name).set({ points });
      res.status(200).json({ success: true, chartId: name });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.get('/api/GetAllSavedECGNames', async (req, res) => {

  console.log('namesReached')
  try {
    const usersRef = db.collection("ECG");
    const response = await usersRef.get();

    const docNames = response.docs.map(doc => doc.id);
    res.send(docNames);
  } catch (err) {
    res.status(500).send(err);
  }
});



app.get('/api/GetSavedECG', async (req, res) => {
  try {
    const chartName = req.query.name; 
    console.log(chartName)

    const userRef = db.collection("ECG").doc(chartName);
    const doc = await userRef.get();
    if (doc.exists) {
      res.send(doc.data().points);
    } else {
      res.send({ error: "Document not found" });
    }
  } catch (err) {
    res.status(500).send(err);
  }
});


//Temperature Api

app.post('/api/update', async (req, res) => {
  console.log(req.body);
  const bodytemperature = req.body.temperature;
  const roomtemperature = req.body.temperature2;

  io.sockets.emit('TempUpdate', { bodytemperature, roomtemperature });
  console.log(parseInt(roomtemperature));

  if (parseInt(roomtemperature) < 21) {
    console.log('reach');
    const TempnotificationPayload = {
      notification: {
        title: ' Room Temperature Hazard!',
        body: `Room temperature is below 21 it is ${roomtemperature}`
      }
    };

    try {
      const subscribers = await fetchSubscribersFromDatabase();
      await Promise.all(subscribers.map(sub => webpush.sendNotification(sub, JSON.stringify(TempnotificationPayload))));
      console.log("notif sent succesfully")
    } catch (err) {
      console.error("Error sending notifications:", err);
    }
  }

  console.log('Received temperatures:', bodytemperature, roomtemperature);
  res.json({ bodytemperature, roomtemperature, message: 'Notifications processed successfully.' });
});



server.listen( port, () => {
  console.log(`Server is running on port ${port}`);
});