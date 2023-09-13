const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.CLIENT}:${process.env.CLIENTINFO}@cluster0.z8w3emk.mongodb.net/?retryWrites=true&w=majority`;
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json())


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(authorization)
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized Access' })
  }
  const token = authorization.split(' ')[1];
  // console.log(token)

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'Unauthorized Access' })
    }
    req.decoded = decoded
    next()
  })
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('practiceCarDoctor').collection('serviceDoc')
    const bookingCollection = client.db('practiceCarDoctor').collection('bookings')

    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
      })
      console.log(token)
      res.send({ token })
    })

    // first step service doc read and show client site
    app.get('/service', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray()
      res.send(result)
    })

    // second step single doc show
    app.get('/service/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { _id: 1, img: 1, price: 1, title: 1, service_id: 1 }
      };
      const result = await serviceCollection.findOne(query, options)
      res.send(result)
    })

    // third step create doc in server site 
    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      // console.log(booking)
      const result = await bookingCollection.insertOne(booking)
      res.send(result)
    })

    app.get('/bookings', verifyJWT, async (req, res) => {
      const decoded = req.decoded
      console.log('came back after verify', decoded)
      if (decoded.email !== req.query.email) {
        return res.status(403).send({ error: 1, message: 'Forbidden Access' })
      }

      // console.log(req.query.email)
      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const cursor = await bookingCollection.find(query).toArray();
      res.send(cursor)
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })

    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const bookingUpdate = req.body;
      // console.log(bookingUpdate)
      const updateDoc = {
        $set: {
          status: bookingUpdate.status
        }
      }
      const result = await bookingCollection.updateOne(filter, updateDoc)
      res.send(result)


    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);






app.get('/', (req, res) => {
  res.send('car doctor server is running')
});

app.listen(port, (req, res) => {
  console.log(`car doctor server running on PORT: ${port}`)
})