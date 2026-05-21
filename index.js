express = require("express");
const app = express();
cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const dotenv = require("dotenv");
dotenv.config();

app.use(express.json());
app.use(cors());
const port = process.env.PORT || 7000;

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    db = client.db("tutorflow");
    const tutorCollection = db.collection("tutors");
    const bookingCollection = db.collection("bookings");

    app.post("/tutors", async (req, res) => {
      const newTutor = req.body;
      const result = await tutorCollection.insertOne(newTutor);
      res.send(result);
    });

    // app.get("/tutors", async (req, res) => {
    //   const cursor = tutorCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // });

    app.get("/tutors", async (req, res) => {
      const result = await tutorCollection.find().toArray();
      res.send(result);
    });

    app.get("/tutors/:id", async (req, res) => {
      const { id } = req.params;
      const result = await tutorCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const newBooking = req.body;
      const result = await bookingCollection.insertOne(newBooking);
      res.send(result);
    });

    app.get("/booking/:userId", async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId: userId }).toArray();
      res.send(result);
    });

    app.delete("/tutors/:id", async (req, res) => {
      const { id } = req.params;

      const result = await tutorCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // app.patch("/booking/:id", async (req, res) => {
    //   const { id } = req.params;
    //   const filter = {
    //     _id: new ObjectId(id),
    //   };
    //   const modifyUser = req.body;
    //   const updateDoc = {
    //     $set: {
    //       status: modifyUser.status,
    //       cancel: modifyUser.cancel,
    //     },
    //   };
    //   const result = await bookingCollection.updateOne(filter, updateDoc);
    //   res.send(result);
    // });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});
