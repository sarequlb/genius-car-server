const express = require('express')
const cors = require('cors')
const app = express()
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;



app.use(cors())
app.use(express.json())



const uri = 'mongodb+srv://geniusDBUser:oDxVIhCrkMw2A78S@cluster0.pzjaifg.mongodb.net/?retryWrites=true&w=majority';
console.log(process.env.DB_USER, process.env.DB_PASSWORD)
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
    if (error) {
      return res.status(401).send({ message: 'unauthorized access' })
    }

    req.decoded = decoded;
    next()
  })
}



async function run() {
  try {
    const serviceCollection = client.db('geniusCar').collection('services');
    const orderCollection = client.db('geniusCar').collection('orders');


    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
      res.send({ token })
    })

    app.get('/services', async (req, res) => {
      const search = req.query.search;
      // console.log(search.length)
      let query = {}
      if (search.length) {
        query = {
          $text: {
            $search: search
          }
        }
      }
      // const query = {price:{$lt: 100}}
      // const query = {price:{$eq: 30}}
      // const query = {price:{$gte: 30}}
      // const query = {price:{$lte: 30}}
      // const query = {price:{$ne: 30}}
      // const query = {price:{$in:[30,40,200]}}
      // const query = {price:{$nin:[30,40,200]}}
      // const query = {$and: [{price:{gt:20}},]}
      const order = req.query.order === 'asc' ? 1 : -1
      const cursor = serviceCollection.find(query).sort({price: order})
      
      const services = await cursor.toArray()
      res.send(services)

    })

    app.get('/service/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const service = await serviceCollection.findOne(query)
      res.send(service)
    })

    //orders api

    app.get('/orders', verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      console.log('inside orders api', decoded)
      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: 'unauthorized access' })
      }
      let query = {};
      if (req.query.email) {
        query = {
          email: req.query.email
        }
      }
      const cursor = orderCollection.find(query)
      const orders = await cursor.toArray()
      res.send(orders)

    })

    app.post('/orders', verifyJWT, async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result)
    })

    app.patch('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const status = req.body.status;
      const query = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: status
        }
      }

      const result = await orderCollection.updateOne(query, updatedDoc)
      res.send(result)
    })

    app.delete('/orders/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await orderCollection.deleteOne(query)
      res.send(result)
    })
  }
  finally {

  }
}
run().catch(error => console.error(error));



app.get('/', (req, res) => {
  res.send('genius car')
})

app.listen(port, () => {
  console.log(`genius car running on ${port}`)
})